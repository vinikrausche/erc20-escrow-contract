// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/access/AccessControlUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/utils/PausableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/utils/ReentrancyGuardUpgradeable.sol";

contract ERC20Escrow is
    Initializable,
    UUPSUpgradeable,
    AccessControlUpgradeable,
    PausableUpgradeable,
    ReentrancyGuardUpgradeable
{
    using SafeERC20 for IERC20;

    enum Status { None, Created, Funded, Released, Refunded, Disputed, Cancelled }

    bytes32 public constant UPGRADER_ROLE       = keccak256("UPGRADER_ROLE");
    bytes32 public constant FUNDS_OPERATOR_ROLE = keccak256("FUNDS_OPERATOR_ROLE");
    bytes32 public constant PAUSER_ROLE         = keccak256("PAUSER_ROLE");

    struct Deal {
        address payer;
        address payee;
        address arbiter;   // 0x0 means no arbiter
        address token;
        uint256 amount;    // expected amount
        uint256 funded;    // received amount
        uint64  deadline;  // 0 means no expiration
        Status  status;
    }

    mapping(bytes32 => Deal) public deals;

    event DealCreated(bytes32 indexed dealId, address payer, address payee, address arbiter, address token, uint256 amount, uint64 deadline);
    event Deposited(bytes32 indexed dealId, uint256 funded);
    event Disputed(bytes32 indexed dealId);
    event Released(bytes32 indexed dealId, address to, uint256 amount);
    event Refunded(bytes32 indexed dealId, address to, uint256 amount);
    event Cancelled(bytes32 indexed dealId);

    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() {
        _disableInitializers();
    }

    function initialize(address admin) public initializer {
        require(admin != address(0), "Admin cannot be zero address");

        __UUPSUpgradeable_init();
        __ReentrancyGuard_init();
        __Pausable_init();
        __AccessControl_init();

        _grantRole(DEFAULT_ADMIN_ROLE, admin);
        _grantRole(UPGRADER_ROLE, admin);
        _grantRole(FUNDS_OPERATOR_ROLE, admin);
        _grantRole(PAUSER_ROLE, admin);
    }

    function _authorizeUpgrade(address) internal override onlyRole(UPGRADER_ROLE) {}

    function pause() external onlyRole(PAUSER_ROLE) { _pause(); }
    function unpause() external onlyRole(PAUSER_ROLE) { _unpause(); }

    function createDeal(
        address payer,
        address payee,
        address arbiter,
        address token,
        uint256 amount,
        uint64 deadline,
        bytes32 salt
    ) external nonReentrant whenNotPaused onlyRole(FUNDS_OPERATOR_ROLE) returns (bytes32 dealId) {
        require(token != address(0), "Invalid token");
        require(amount > 0, "Invalid amount");
        require(payer != address(0), "Invalid payer");
        require(payee != address(0), "Invalid payee");
        require(deadline == 0 || deadline > block.timestamp, "Invalid deadline");

        dealId = keccak256(abi.encode(payer, payee, arbiter, token, amount, deadline, salt));
        require(deals[dealId].status == Status.None, "Deal already exists");

        deals[dealId] = Deal({
            payer: payer,
            payee: payee,
            arbiter: arbiter,
            token: token,
            amount: amount,
            funded: 0,
            deadline: deadline,
            status: Status.Created
        });

        emit DealCreated(dealId, payer, payee, arbiter, token, amount, deadline);
    }

    function deposit(bytes32 dealId) external nonReentrant whenNotPaused onlyRole(FUNDS_OPERATOR_ROLE) {
        Deal storage d = deals[dealId];
        require(d.status == Status.Created, "Invalid status");

        // Measure exact amount received to reject fee-on-transfer tokens.
        uint256 beforeBal = IERC20(d.token).balanceOf(address(this));
        IERC20(d.token).safeTransferFrom(d.payer, address(this), d.amount);
        uint256 afterBal = IERC20(d.token).balanceOf(address(this));

        uint256 received = afterBal - beforeBal;
        require(received == d.amount, "Token fee not supported (received!=amount)");

        d.funded = received;
        d.status = Status.Funded;

        emit Deposited(dealId, received);
    }

    function dispute(bytes32 dealId) external nonReentrant whenNotPaused onlyRole(FUNDS_OPERATOR_ROLE) {
        Deal storage d = deals[dealId];
        require(d.status == Status.Funded, "Invalid status");
        require(d.arbiter != address(0), "No arbiter");
        d.status = Status.Disputed;
        emit Disputed(dealId);
    }

    function release(bytes32 dealId) external nonReentrant whenNotPaused onlyRole(FUNDS_OPERATOR_ROLE) {
        Deal storage d = deals[dealId];
        require(d.status == Status.Funded || d.status == Status.Disputed, "Invalid status");
        require(d.funded == d.amount, "Not fully funded");

        // Authorization model:
        if (d.arbiter != address(0)) {
            // If an arbiter exists, decision logic can be enforced off-chain by backend policy.
            // Since this flow uses FUNDS_OPERATOR_ROLE, the backend currently executes settlement.
        }

        d.status = Status.Released;
        IERC20(d.token).safeTransfer(d.payee, d.amount);

        emit Released(dealId, d.payee, d.amount);
    }

    function refund(bytes32 dealId) external nonReentrant whenNotPaused onlyRole(FUNDS_OPERATOR_ROLE) {
        Deal storage d = deals[dealId];
        require(d.status == Status.Funded || d.status == Status.Disputed, "Invalid status");
        require(d.funded == d.amount, "Not fully funded");

        // Refund is allowed by expiration deadline (if set) or by arbiter-enabled flow.
        bool expired = (d.deadline != 0 && block.timestamp >= d.deadline);
        require(expired || d.arbiter != address(0), "Refund not allowed");

        d.status = Status.Refunded;
        IERC20(d.token).safeTransfer(d.payer, d.amount);

        emit Refunded(dealId, d.payer, d.amount);
    }

    function cancel(bytes32 dealId) external nonReentrant whenNotPaused onlyRole(FUNDS_OPERATOR_ROLE) {
        Deal storage d = deals[dealId];
        require(d.status == Status.Created, "Invalid status");
        d.status = Status.Cancelled;
        emit Cancelled(dealId);
    }
}
