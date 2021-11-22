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

  it("shouldn't let non-owner withdraw", async () => {
    const { lottery } = await deployContracts();
    // eslint-disable-next-line no-unused-vars
    const [_, addr1] = await ethers.getSigners();

    await expect(
      lottery.connect(addr1).ownerWithdrawERC20(addr1.address)
    ).to.be.revertedWith("msg.sender must be owner");
  });

  it("shouldn't let me buy zero tickets", async () => {
    const { lottery } = await deployContracts();
    await expect(lottery.buyTickets(0)).to.be.revertedWith(
      "non-positive ticketCount"
    );
  });

  it("shouldn't let me buy negative tickets", async () => {
    const { lottery } = await deployContracts();
    await expect(lottery.buyTickets(-40)).to.be.revertedWith(
      "non-positive ticketCount"
    );
  });

  it("shouldn't let me buy tickets with 0 approved tokens", async () => {
    const { lottery } = await deployContracts();
    await expect(lottery.buyTickets(1)).to.be.revertedWith(
      "msg.sender too little allowance"
    );
  });

  it("shouldn't let me buy tickets with too few approved tokens", async () => {
    const { lotteryMokToken, lottery } = await deployContracts();

    lotteryMokToken.mint(20);
    lotteryMokToken.approve(lottery.address, 19);
    await expect(lottery.buyTickets(1)).to.be.revertedWith(
      "msg.sender too little allowance"
    );
  });

  it("shouldn't let me spend more tokens then I own", async () => {
    const { lotteryMokToken, lottery } = await deployContracts();

    lotteryMokToken.mint(19);
    lotteryMokToken.approve(lottery.address, 20);
    await expect(lottery.buyTickets(1)).to.be.revertedWith(
      "msg.sender too little allowance"
    );
  });
});
