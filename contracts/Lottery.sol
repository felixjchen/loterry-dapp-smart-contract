//SPDX-License-Identifier: Unlicense
pragma solidity ^0.8.0;

import "hardhat/console.sol";
import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

contract Lottery {
  address private ownerAddress;
  address[2] private managerAddress;

  uint256 private ticketPrice;
  uint256 private feeTotal;
  mapping(address => uint256) private tickets;

  event Incoming(address, uint256);
  event Outgoing(address, uint256);

  // https://ethereum.org/en/developers/tutorials/transfers-and-approval-of-erc-20-tokens-from-a-solidity-smart-contract/
  IERC20 public token;

  // Constructor is run once upon deploying SC... used to set intial state
  constructor() {
    // In the constructor... msg.sender is the owner of smart contract
    ownerAddress = msg.sender;

    token = new lotteryMokToken();
  }

  modifier onlyOwner() {
    require(msg.sender == ownerAddress, "msg.sender must be owner");
    _;
  }

  function buyTickets(address recipient) public {}

  // Dumps entire feeTotal into recipient's address.
  // Only owner can call this function
  function ownerWithdrawERC20(address recipient) public onlyOwner {
    token.transfer(recipient, feeTotal);
    emit Outgoing(recipient, feeTotal);
    feeTotal = 0;
  }
}

// Inheriting from ERC20 gives us basic fungible token methods
// https://docs.openzeppelin.com/contracts/4.x/api/token/erc20#core
contract lotteryMokToken is ERC20 {
  // Constructor is run once upon deploying SC... used to set intial state
  constructor() ERC20("lotteryMokToken", "MOK") {
    // In the constructor... msg.sender is the owner of smart contract
  }

  function mint(uint256 amount) public {
    _mint(msg.sender, amount);
  }
}
