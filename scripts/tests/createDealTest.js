const {
  Status,
  assert,
  nowSeconds,
  deployBaseFixture,
  createDeal,
  expectRevert,
  assertStatus,
  printSuccess
} = require("./_shared");

async function main() {
  const fixture = await deployBaseFixture();

  const deadline = nowSeconds() + 3600;
  const deal = await createDeal(fixture, {
    deadline,
    saltLabel: "create-deal-test"
  });

  const storedDeal = await fixture.escrow.deals(deal.dealId);
  assert.equal(storedDeal.payer, fixture.payer.address, "Unexpected payer");
  assert.equal(storedDeal.payee, fixture.payee.address, "Unexpected payee");
  assert.equal(storedDeal.arbiter, fixture.arbiter.address, "Unexpected arbiter");
  assert.equal(storedDeal.token, await fixture.token.getAddress(), "Unexpected token");
  assert.equal(storedDeal.amount, fixture.defaultAmount, "Unexpected amount");
  assert.equal(storedDeal.funded, 0n, "Funded amount must start at zero");
  assert.equal(Number(storedDeal.deadline), deadline, "Unexpected deadline");
  assertStatus(storedDeal, Status.Created, "Deal");

  await expectRevert(
    fixture.escrow
      .connect(fixture.admin)
      .createDeal(
        deal.payer,
        deal.payee,
        deal.arbiter,
        deal.token,
        deal.amount,
        deal.deadline,
        deal.salt
      ),
    "Deal already exists"
  );

  printSuccess("createDealTest");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
