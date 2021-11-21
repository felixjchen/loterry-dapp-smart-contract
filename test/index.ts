import { expect } from "chai";
import { ethers } from "hardhat";

describe("lotteryMokToken", () => {
  it("Should have an intial balance of 40", async () => {
    const LotteryMokToken = await ethers.getContractFactory("lotteryMokToken");
    const lotteryMokToken = await LotteryMokToken.deploy(40);
    await lotteryMokToken.deployed();

    const [owner] = await ethers.getSigners();

    const ownerBalance = await lotteryMokToken.balanceOf(owner.address);
    expect(ownerBalance).to.equal(40);
  });
});

describe("Lottery", () => {
  const deployContracts = async () => {
    const LotteryMokToken = await ethers.getContractFactory("lotteryMokToken");
    const lotteryMokToken = await LotteryMokToken.deploy(40);
    await lotteryMokToken.deployed();

    const Lottery = await ethers.getContractFactory("Lottery");
    const lottery = await Lottery.deploy();
    await lotteryMokToken.deployed();
    return { lotteryMokToken, lottery };
  };

  it("should let owner withdraw", async () => {
    const { lotteryMokToken, lottery } = await deployContracts();
    const [owner, addr1] = await ethers.getSigners();

    await lottery.ownerWithdrawERC20(lotteryMokToken.address, addr1.address);

    const ownerBalance = await lotteryMokToken.balanceOf(owner.address);
    expect(ownerBalance).to.equal(40);
  });

  it("shouldn't let not owner withdraw", async () => {
    const { lotteryMokToken, lottery } = await deployContracts();
    // eslint-disable-next-line no-unused-vars
    const [_, addr1] = await ethers.getSigners();

    await expect(
      lottery
        .connect(addr1)
        .ownerWithdrawERC20(lotteryMokToken.address, addr1.address)
    ).to.be.reverted;
  });
});
