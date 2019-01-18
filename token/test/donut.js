var Donut = artifacts.require('./Donut.sol');

contract('Donut', function(accounts) {
  it('should start with 0 Donuts in the first account', function() {
    return Donut.deployed().then(function(instance) {
      return instance.balanceOf.call(accounts[0]);
    }).then(function(balance) {
      assert.equal(balance.valueOf(), 0);
    });
  });
  it('should mint Donuts with the first account', function() {
    var donut;
    var account = accounts[1];
    return Donut.deployed().then(function(instance) {
      donut = instance;
      return donut.mint(account, 100, {from: accounts[0]});
    }).then(function() {
      return donut.balanceOf.call(account);
    }).then(function(balance) {
      assert.equal(balance.valueOf(), 100);
    });
  });
  it('should not mint Donuts with the second account', function() {
    var donut;
    var account = accounts[1];
    return Donut.deployed().then(function(instance) {
      donut = instance;
      return donut.mint(accounts[0], 100, {from: account});
    }).then(function() {
      assert(false, 'Expected error.');
    }, function(err) {
      if (err.message != 'VM Exception while processing transaction: revert') {
        throw err;
      }
    });
  });
  it('should deposit whole Donuts', function() {
    var donut;
    var account = accounts[2];
    return Donut.deployed().then(function(instance) {
      donut = instance;
      return donut.mint(
          account,
          '1000000000000000000',
          {from: accounts[0]});
    }).then(function() {
      return donut.balanceOf.call(account);
    }).then(function(balance) {
      assert.equal(balance.valueOf(), '1000000000000000000');
    }).then(function() {
      return donut.deposit.call('0x01', '1000000000000000000', {from: account});
    }).then(function() {
      return donut.balanceOf.call(account);
    }).then(function(balance) {
      // TODO: This fails inexplicably.
      assert.equal(balance.valueOf(), 0);
    });
  });
  it('should not deposit partial Donuts', function() {
    var donut;
    var account = accounts[3];
    return Donut.deployed().then(function(instance) {
      donut = instance;
      return donut.mint(
          account,
          '1000000000000000000',
          {from: accounts[0]});
    }).then(function(balance) {
      return donut.balanceOf.call(account);
    }).then(function(balance) {
      assert.equal(balance.valueOf(), '1000000000000000000');
    }).then(function() {
      // One less '0' in the deposit.
      return donut.deposit.call('0x01', '100000000000000000', {from: account});
    }).then(function() {
      assert(false, 'Expected error.');
    }, function(err) {
      if (err.message != 'VM Exception while processing transaction: revert') {
        throw err;
      }
    });
  });
  it('should send coin correctly', function() {
    var donut;

    // Get initial balances of first and second account.
    var account_one = accounts[0];
    var account_two = accounts[4];

    var account_one_starting_balance;
    var account_two_starting_balance;
    var account_one_ending_balance;
    var account_two_ending_balance;

    var amount = 10;

    return Donut.deployed().then(function(instance) {
      donut = instance;
      return donut.mint(account_one, 100, {from: account_one});
    }).then(function() {
      return donut.balanceOf.call(account_one);
    }).then(function(balance) {
      account_one_starting_balance = balance.toNumber();
      return donut.balanceOf.call(account_two);
    }).then(function(balance) {
      account_two_starting_balance = balance.toNumber();
      return donut.transfer(account_two, amount, {from: account_one});
    }).then(function() {
      return donut.balanceOf.call(account_one);
    }).then(function(balance) {
      account_one_ending_balance = balance.toNumber();
      return donut.balanceOf.call(account_two);
    }).then(function(balance) {
      account_two_ending_balance = balance.toNumber();

      assert.equal(account_one_ending_balance, account_one_starting_balance - amount, 'Amount wasn\'t correctly taken from the sender');
      assert.equal(account_two_ending_balance, account_two_starting_balance + amount, 'Amount wasn\'t correctly sent to the receiver');
    });
  });
});
