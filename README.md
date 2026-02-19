# ERC20Escrow (UUPS Proxy) - Plug and Play Guide

Upgradeable ERC20 escrow contract built with Hardhat and OpenZeppelin.

License: MIT

## What this contract does

`ERC20Escrow.sol` manages escrow deals between:

- `payer`: the account that funds the deal
- `payee`: the account that receives funds when released
- `arbiter`: optional dispute authority (`0x0` means no arbiter)
- `admin`: privileged account that operates the contract through roles

The contract is UUPS-upgradeable and role-based.

## Requirements

- Node.js 18+
- npm 9+
- One admin address to initialize and operate the contract
- Local Hardhat node (for local testing/deployment)

## Roles and permissions

On `initialize(admin)`, the admin receives:

- `DEFAULT_ADMIN_ROLE`
- `UPGRADER_ROLE`
- `FUNDS_OPERATOR_ROLE`
- `PAUSER_ROLE`

This means the admin can pause/unpause, create and settle deals, and upgrade the proxy implementation.

## Deal lifecycle

`Status` enum:

- `0`: None
- `1`: Created
- `2`: Funded
- `3`: Released
- `4`: Refunded
- `5`: Disputed
- `6`: Cancelled

Typical flow:

1. `createDeal(...)`
2. `deposit(dealId)`
3. Optional `dispute(dealId)`
4. `release(dealId)` or `refund(dealId)`

## Function reference

### `initialize(address admin)`

Initializes the upgradeable proxy and assigns all required roles to `admin`.

### `pause()`

Pauses state-changing operations. Callable by `PAUSER_ROLE`.

### `unpause()`

Resumes state-changing operations. Callable by `PAUSER_ROLE`.

### `createDeal(...)`

Creates a new escrow deal with payer/payee/arbiter/token/amount/deadline metadata.

### `deposit(bytes32 dealId)`

Transfers the expected token amount from `payer` into escrow and sets status to `Funded`.

### `dispute(bytes32 dealId)`

Marks a funded deal as `Disputed`. Requires an arbiter to exist.

### `release(bytes32 dealId)`

Transfers funded amount to `payee` and marks deal as `Released`.

### `refund(bytes32 dealId)`

Transfers funded amount back to `payer` and marks deal as `Refunded`. Allowed when deadline expired or arbiter-enabled flow is used.

### `cancel(bytes32 dealId)`

Cancels a deal while it is still `Created`.

## Project structure

- `contracts/ERC20Escrow.sol`: main UUPS escrow contract
- `contracts/mocks/MockERC20.sol`: mock token for testing flows
- `scripts/deploy.js`: deploys proxy + mock token locally
- `scripts/upgradeProxy.js`: upgrades an existing proxy
- `scripts/tests/`: one script test per contract function

## Install and compile

```bash
npm install
npm run compile
```

## Run local node

```bash
npm run node
```

## Deploy proxy locally

In a second terminal:

```bash
npm run deploy:proxy:localhost
```

This prints:

- admin/deployer addresses
- proxy address
- implementation address

## Upgrade proxy locally

Set your proxy address and run:

```bash
PROXY_ADDRESS=0xYourProxyAddress npm run upgrade:proxy:localhost
```

Important: the connected signer must have `UPGRADER_ROLE`.

## Script tests (function-by-function)

Each file is named `<functionName>Test.js` and validates one function:

- `scripts/tests/initializeTest.js`
- `scripts/tests/pauseTest.js`
- `scripts/tests/unpauseTest.js`
- `scripts/tests/createDealTest.js`
- `scripts/tests/depositTest.js`
- `scripts/tests/disputeTest.js`
- `scripts/tests/releaseTest.js`
- `scripts/tests/refundTest.js`
- `scripts/tests/cancelTest.js`

Run all script tests:

```bash
npm run test:scripts
```

Run individual function tests:

```bash
npm run test:initialize
npm run test:pause
npm run test:unpause
npm run test:createDeal
npm run test:deposit
npm run test:dispute
npm run test:release
npm run test:refund
npm run test:cancel
```

`npm test` is mapped to `npm run test:scripts` for a simple default flow.
