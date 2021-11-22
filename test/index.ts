import { expect } from "chai";
import { ethers } from "hardhat";

describe("MockToken", () => {
  it("should have an intial balance of 0", async () => {
    const MockToken = await ethers.getContractFactory("MockToken");
    const MOK = await MockToken.deploy();
    await MOK.deployed();

    const [owner] = await ethers.getSigners();

    const ownerBalance = await MOK.balanceOf(owner.address);
    expect(ownerBalance).to.equal(0);
  });

  it("should allow user to mint themself tokens", async () => {
    const MockToken = await ethers.getContractFactory("MockToken");
    const MOK = await MockToken.deploy();
    await MOK.deployed();

    const [owner] = await ethers.getSigners();

    expect(await MOK.balanceOf(owner.address)).to.equal(0);
    MOK.mint(ethers.utils.parseEther("10012"));
    expect(await MOK.balanceOf(owner.address)).to.equal(
      ethers.utils.parseEther("10012")
    );
  });
});

describe("Lottery", () => {
  const deployContracts = async () => {
    const MockToken = await ethers.getContractFactory("MockToken");
    const MOK = await MockToken.deploy();
    await MOK.deployed();

    const Lottery = await ethers.getContractFactory("Lottery");
    const lottery = await Lottery.deploy(MOK.address);
    await lottery.deployed();
    return { MOK, lottery };
  };

  it("should let owner withdraw to themself", async () => {
    const { MOK, lottery } = await deployContracts();
    const [owner] = await ethers.getSigners();
    await lottery.ownerWithdraw(owner.address);
    const ownerBalance = await MOK.balanceOf(owner.address);
    expect(ownerBalance).to.equal(0);
  });

  it("should let owner withdraw to someone else", async () => {
    const { MOK, lottery } = await deployContracts();
    const [_, addr1] = await ethers.getSigners();
    await lottery.ownerWithdraw(addr1.address);
    expect(await MOK.balanceOf(addr1.address)).to.equal(0);
  });

  it("shouldn't let non-owner withdraw", async () => {
    const { lottery } = await deployContracts();
    // eslint-disable-next-line no-unused-vars
    const [_, addr1] = await ethers.getSigners();

    await expect(
      lottery.connect(addr1).ownerWithdraw(addr1.address)
    ).to.be.revertedWith("msg.sender must be owner");
  });

  it("shouldn't let me buy zero tickets", async () => {
    const { lottery } = await deployContracts();
    await expect(lottery.buyTickets(0)).to.be.revertedWith("zero ticketCount");
  });

  it("shouldn't let me buy tickets with too few approved tokens", async () => {
    const { MOK, lottery } = await deployContracts();

    await MOK.mint(ethers.utils.parseEther("10012"));
    await MOK.approve(lottery.address, ethers.utils.parseEther("19"));
    await expect(lottery.buyTickets(1)).to.be.revertedWith(
      "ERC20: transfer amount exceeds allowance"
    );
  });

  it("should have zero tickets for me on init", async () => {
    const { lottery } = await deployContracts();
    expect(await lottery.getTickets()).to.be.equal(0);
  });

  it("should have a few tickets after buyTickets", async () => {
    const { MOK, lottery } = await deployContracts();
    const [owner] = await ethers.getSigners();
    await MOK.mint(ethers.utils.parseEther("40"));
    await MOK.approve(lottery.address, ethers.utils.parseEther("40"));
    await lottery.buyTickets(2);
    expect(await lottery.getTickets()).to.be.equal(2);
    expect(await MOK.balanceOf(owner.address)).to.be.equal(0);
  });

  it("should have fees to withdraw after buyTickets", async () => {
    const { MOK, lottery } = await deployContracts();
    const [owner] = await ethers.getSigners();
    await MOK.mint(ethers.utils.parseEther("40"));
    await MOK.approve(lottery.address, ethers.utils.parseEther("40"));
    await lottery.buyTickets(2);

    // 40 * 0.05 = 2
    await lottery.ownerWithdraw(owner.address);
    expect(await MOK.balanceOf(owner.address)).to.be.equal(
      ethers.utils.parseEther("2")
    );
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

  it("should have ticket price of 20e18 on init", async () => {
    const { lottery } = await deployContracts();
    expect(await lottery.getTicketPrice()).to.be.equal(
      ethers.utils.parseEther("20")
    );
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
    const { MOK, lottery } = await deployContracts();
    await MOK.mint(ethers.utils.parseEther("40"));
    await MOK.approve(lottery.address, ethers.utils.parseEther("40"));
    await lottery.buyTickets(1);
    await lottery.draw();
    await lottery.buyTickets(1);
    await expect(lottery.draw()).to.be.revertedWith(
      "need 5 minutes between draws"
    );
  });

  it("should let managers start a draw", async () => {
    const { MOK, lottery } = await deployContracts();
    // eslint-disable-next-line no-unused-vars
    const [_, addr1] = await ethers.getSigners();
    await lottery.setManager(0, addr1.address);
    await MOK.mint(ethers.utils.parseEther("40"));
    await MOK.approve(lottery.address, ethers.utils.parseEther("40"));
    await lottery.buyTickets(1);
    await lottery.connect(addr1).draw();
  });

  it("should payout 95% on draws", async () => {
    const { MOK, lottery } = await deployContracts();
    // eslint-disable-next-line no-unused-vars
    const [_, addr1] = await ethers.getSigners();
    await MOK.connect(addr1).mint(ethers.utils.parseEther("100"));
    await MOK.connect(addr1).approve(
      lottery.address,
      ethers.utils.parseEther("100")
    );
    await lottery.connect(addr1).buyTickets(5);
    await lottery.draw();
    expect(await MOK.balanceOf(addr1.address)).to.be.equal(
      ethers.utils.parseEther("95")
    );
  });
});
