import { expect } from "chai";
import { ethers } from "hardhat";

describe("MockToken", () => {
  it("should have an intial balance of 0", async () => {
    const MockToken = await ethers.getContractFactory("MockToken");
    const mockToken = await MockToken.deploy();
    await mockToken.deployed();

    const [owner] = await ethers.getSigners();

    const ownerBalance = await mockToken.balanceOf(owner.address);
    expect(ownerBalance).to.equal(0);
  });

  it("should allow user to mint themself tokens", async () => {
    const MockToken = await ethers.getContractFactory("MockToken");
    const mockToken = await MockToken.deploy();
    await mockToken.deployed();

    const [owner] = await ethers.getSigners();

    expect(await mockToken.balanceOf(owner.address)).to.equal(0);
    mockToken.mint(10012);
    expect(await mockToken.balanceOf(owner.address)).to.equal(10012);
  });
});

describe("Lottery", () => {
  const deployContracts = async () => {
    const MockToken = await ethers.getContractFactory("MockToken");
    const mockToken = await MockToken.deploy();
    await mockToken.deployed();

    const Lottery = await ethers.getContractFactory("Lottery");
    const lottery = await Lottery.deploy(mockToken.address);
    await mockToken.deployed();
    return { mockToken, lottery };
  };

  it("should let owner withdraw to themself", async () => {
    const { mockToken, lottery } = await deployContracts();
    const [owner] = await ethers.getSigners();
    await lottery.ownerWithdrawTo(owner.address);
    const ownerBalance = await mockToken.balanceOf(owner.address);
    expect(ownerBalance).to.equal(0);
  });

  it("should let owner withdraw to someone else", async () => {
    const { mockToken, lottery } = await deployContracts();
    const [_, addr1] = await ethers.getSigners();
    await lottery.ownerWithdrawTo(addr1.address);
    expect(await mockToken.balanceOf(addr1.address)).to.equal(0);
  });

  it("shouldn't let non-owner withdraw", async () => {
    const { lottery } = await deployContracts();
    // eslint-disable-next-line no-unused-vars
    const [_, addr1] = await ethers.getSigners();

    await expect(
      lottery.connect(addr1).ownerWithdrawTo(addr1.address)
    ).to.be.revertedWith("msg.sender must be owner");
  });

  it("shouldn't let me buy zero tickets", async () => {
    const { lottery } = await deployContracts();
    await expect(lottery.buyTickets(0)).to.be.revertedWith(
      "negative ticketCount"
    );
  });

  it("shouldn't let me buy tickets with too few approved tokens", async () => {
    const { mockToken, lottery } = await deployContracts();

    mockToken.mint(10012);
    mockToken.approve(lottery.address, 19);
    await expect(lottery.buyTickets(1)).to.be.revertedWith(
      "msg.sender approved too little"
    );
  });

  it("should have zero tickets for me on init", async () => {
    const { lottery } = await deployContracts();
    expect(await lottery.getTickets()).to.be.equal(0);
  });

  it("should have a few tickets after buyTickets", async () => {
    const { mockToken, lottery } = await deployContracts();
    mockToken.mint(40);
    mockToken.approve(lottery.address, 40);
    await lottery.buyTickets(2);
    expect(await lottery.getTickets()).to.be.equal(2);
  });

  it("should have fees to withdraw after buyTickets", async () => {
    const { mockToken, lottery } = await deployContracts();
    const [owner] = await ethers.getSigners();
    mockToken.mint(40);
    mockToken.approve(lottery.address, 40);
    await lottery.buyTickets(2);

    // 40 * 0.05 = 2
    await lottery.ownerWithdrawTo(owner.address);
    expect(await mockToken.balanceOf(owner.address)).to.be.equal(2);
  });

  it("should have no managers on init", async () => {
    const { lottery } = await deployContracts();

    const managers = await lottery.getManagers();
    expect(managers[0]).to.be.equal(
      "0x0000000000000000000000000000000000000000"
    );
    expect(managers[1]).to.be.equal(
      "0x0000000000000000000000000000000000000000"
    );
  });

  it("should let owner set managers", async () => {
    const { lottery } = await deployContracts();
    // eslint-disable-next-line no-unused-vars
    const [_, addr1, addr2] = await ethers.getSigners();

    await lottery.setManager(0, addr1.address);
    await lottery.setManager(1, addr2.address);

    const managers = await lottery.getManagers();
    expect(managers[0]).to.be.equal(addr1.address);
    expect(managers[1]).to.be.equal(addr2.address);
  });

  it("shouldn't let non-owner set managers", async () => {
    const { lottery } = await deployContracts();
    // eslint-disable-next-line no-unused-vars
    const [_, addr1] = await ethers.getSigners();
    await expect(
      lottery.connect(addr1).setManager(0, addr1.address)
    ).to.be.revertedWith("msg.sender must be owner");
  });

  it("shouldn't let non-owner get managers", async () => {
    const { lottery } = await deployContracts();
    // eslint-disable-next-line no-unused-vars
    const [_, addr1] = await ethers.getSigners();
    await expect(lottery.connect(addr1).getManagers()).to.be.revertedWith(
      "msg.sender must be owner"
    );
  });

  it("should have ticket price of 20 on init", async () => {
    const { lottery } = await deployContracts();
    expect(await lottery.getTicketPrice()).to.be.equal(20);
  });
  it("should let owner set ticket price", async () => {
    const { lottery } = await deployContracts();
    await lottery.setTicketPrice(25);
    expect(await lottery.getTicketPrice()).to.be.equal(25);
  });
  it("shouldn't let manager set ticket price", async () => {
    const { lottery } = await deployContracts();
    // eslint-disable-next-line no-unused-vars
    const [_, addr1] = await ethers.getSigners();
    await lottery.setManager(0, addr1.address);
    await expect(lottery.connect(addr1).setTicketPrice(25)).to.be.revertedWith(
      "msg.sender must be owner"
    );
  });
  it("shouldn't let user set ticket price", async () => {
    const { lottery } = await deployContracts();
    // eslint-disable-next-line no-unused-vars
    const [_, addr1] = await ethers.getSigners();
    await expect(lottery.connect(addr1).setTicketPrice(25)).to.be.revertedWith(
      "msg.sender must be owner"
    );
  });
  it("shouldn't let users draw", async () => {
    const { lottery } = await deployContracts();
    // eslint-disable-next-line no-unused-vars
    const [_, addr1] = await ethers.getSigners();
    await expect(lottery.connect(addr1).draw()).to.be.revertedWith(
      "msg.sender must be owner/manager"
    );
  });
  it("shouldn't let a draw happen with no tickets", async () => {
    const { lottery } = await deployContracts();
    await expect(lottery.draw()).to.be.revertedWith("no tickets");
  });
  it("shouldn't let a draw happen within 5 minutes", async () => {
    const { mockToken, lottery } = await deployContracts();
    mockToken.mint(40);
    mockToken.approve(lottery.address, 40);
    await lottery.buyTickets(1);
    await lottery.draw();
    await lottery.buyTickets(1);
    await expect(lottery.draw()).to.be.revertedWith(
      "need 5 minutes between draws"
    );
  });

  it("should let managers start a draw", async () => {
    const { mockToken, lottery } = await deployContracts();
    // eslint-disable-next-line no-unused-vars
    const [owner, addr1] = await ethers.getSigners();
    await lottery.setManager(0, addr1.address);
    mockToken.mint(40);
    mockToken.approve(lottery.address, 40);
    console.log(await mockToken.allowance(owner.address, lottery.address));
    await lottery.buyTickets(1);
    await lottery.connect(addr1).draw();
  });

  it("should payout 5% on draws", async () => {
    const { mockToken, lottery } = await deployContracts();
    // eslint-disable-next-line no-unused-vars
    const [_, addr1] = await ethers.getSigners();
    mockToken.connect(addr1).mint(100);
    mockToken.connect(addr1).approve(lottery.address, 100);
    await lottery.connect(addr1).buyTickets(5);
    await lottery.draw();
    expect(await mockToken.balanceOf(addr1.address)).to.be.equal(95);
  });
});
