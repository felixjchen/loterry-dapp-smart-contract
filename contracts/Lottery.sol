//SPDX-License-Identifier: Unlicense
pragma solidity ^0.8.0;

import "hardhat/console.sol";
import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

contract Lottery {
  address private ownerAddress;
  address[2] private managerAddress;

  uint256 private ticketPrice;
  uint256 private feeTotal;
  mapping(address => uint256) private tickets;

  event Incoming(address, uint256);
  event Outgoing(address, uint256);

  // Constructor is run once upon deploying SC... used to set intial state
  constructor() {
    // In the constructor... msg.sender is the owner of smart contract
    ownerAddress = msg.sender;
  }

  receive() external payable {
    emit Incoming(msg.sender, msg.value);
  }

  modifier onlyOwner() {
    require(msg.sender == ownerAddress, "msg.sender must be owner");
    _;
  }

  // Dumps entire feeTotal into recipient's address.
  // Only owner can call this function
  function ownerWithdrawERC20(ERC20 token, address recipient) public onlyOwner {
    token.transfer(recipient, feeTotal);
    emit Outgoing(recipient, feeTotal);
    feeTotal = 0;
  }
}

// Inheriting from ERC20 gives us basic fungible token methods
// https://docs.openzeppelin.com/contracts/4.x/api/token/erc20#core
contract lotteryMokToken is ERC20 {
  // Constructor is run once upon deploying SC... used to set intial state
  constructor(uint256 initialBalance) ERC20("lotteryMokToken", "MOK") {
    // In the constructor... msg.sender is the owner of smart contract
    _mint(msg.sender, initialBalance);
  }
}
