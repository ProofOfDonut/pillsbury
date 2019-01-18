pragma solidity ^0.4.2;

import 'truffle/Assert.sol';
import 'truffle/DeployedAddresses.sol';
import '../contracts/Donut.sol';

contract TestDonut {

  function testInitialBalanceUsingDeployedContract() public {
    Donut donut = Donut(DeployedAddresses.Donut());

    uint expected = 0;

    Assert.equal(donut.balanceOf(tx.origin), expected, 'Owner should have 0 Donuts initially');
  }

  function testInitialBalanceWithNewDonut() public {
    Donut donut = new Donut();

    uint expected = 0;

    Assert.equal(donut.balanceOf(tx.origin), expected, 'Owner should have 0 Donuts initially');
  }

}
