import { expect } from "chai";
import { ethers } from "hardhat";

describe("lotteryMokToken", () => {
  it("should have an intial balance of 0", async () => {
    const LotteryMokToken = await ethers.getContractFactory("lotteryMokToken");
    const lotteryMokToken = await LotteryMokToken.deploy();
    await lotteryMokToken.deployed();

    const [owner] = await ethers.getSigners();

    const ownerBalance = await lotteryMokToken.balanceOf(owner.address);
    expect(ownerBalance).to.equal(0);
  });

  it("should allow user to mint themself tokens", async () => {
    const LotteryMokToken = await ethers.getContractFactory("lotteryMokToken");
    const lotteryMokToken = await LotteryMokToken.deploy();
    await lotteryMokToken.deployed();

    const [owner] = await ethers.getSigners();

    expect(await lotteryMokToken.balanceOf(owner.address)).to.equal(0);
    lotteryMokToken.mint(10012);
    expect(await lotteryMokToken.balanceOf(owner.address)).to.equal(10012);
  });
});

describe("Lottery", () => {
  const deployContracts = async () => {
    const LotteryMokToken = await ethers.getContractFactory("lotteryMokToken");
    const lotteryMokToken = await LotteryMokToken.deploy();
    await lotteryMokToken.deployed();

    const Lottery = await ethers.getContractFactory("Lottery");
    const lottery = await Lottery.deploy();
    await lotteryMokToken.deployed();
    return { lotteryMokToken, lottery };
  };

  it("should let owner withdraw", async () => {
    const { lotteryMokToken, lottery } = await deployContracts();
    const [owner, addr1] = await ethers.getSigners();

    await lottery.ownerWithdrawERC20(addr1.address);

    const ownerBalance = await lotteryMokToken.balanceOf(owner.address);
    expect(ownerBalance).to.equal(0);
  });

  it("shouldn't let not owner withdraw", async () => {
    // eslint-disable-next-line no-unused-vars
    const { lotteryMokToken, lottery } = await deployContracts();
    // eslint-disable-next-line no-unused-vars
    const [_, addr1] = await ethers.getSigners();

    await expect(lottery.connect(addr1).ownerWithdrawERC20(addr1.address)).to.be
      .reverted;
  });
});
