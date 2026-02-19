const {
  assert,
  deployBaseFixture,
  expectRevert,
  printSuccess
} = require("./_shared");

async function main() {
  const fixture = await deployBaseFixture();

  const defaultAdminRole = await fixture.escrow.DEFAULT_ADMIN_ROLE();
  const upgraderRole = await fixture.escrow.UPGRADER_ROLE();
  const fundsOperatorRole = await fixture.escrow.FUNDS_OPERATOR_ROLE();
  const pauserRole = await fixture.escrow.PAUSER_ROLE();

  assert.equal(
    await fixture.escrow.hasRole(defaultAdminRole, fixture.admin.address),
    true,
    "Admin must have DEFAULT_ADMIN_ROLE"
  );
  assert.equal(
    await fixture.escrow.hasRole(upgraderRole, fixture.admin.address),
    true,
    "Admin must have UPGRADER_ROLE"
  );
  assert.equal(
    await fixture.escrow.hasRole(fundsOperatorRole, fixture.admin.address),
    true,
    "Admin must have FUNDS_OPERATOR_ROLE"
  );
  assert.equal(
    await fixture.escrow.hasRole(pauserRole, fixture.admin.address),
    true,
    "Admin must have PAUSER_ROLE"
  );

  assert.equal(
    await fixture.escrow.hasRole(defaultAdminRole, fixture.outsider.address),
    false,
    "Outsider must not have DEFAULT_ADMIN_ROLE"
  );

  await expectRevert(
    fixture.escrow.connect(fixture.admin).initialize(fixture.admin.address)
  );

  printSuccess("initializeTest");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
