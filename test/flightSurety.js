
var Test = require('../config/testConfig.js');
var BigNumber = require('bignumber.js');

contract('Flight Surety Tests', async (accounts) => {
  const TEST_ORACLES_COUNT = 20;
  var config;
  before('setup contract', async () => {
    config = await Test.Config(accounts);
    await config.flightSuretyData.authorizeContract(config.flightSuretyApp.address);
    await config.flightSuretyData.authorizeContract(config.owner);

  });

  /****************************************************************************************/
  /* Testing                                                            */
  /****************************************************************************************/

  it(`Owners of contracts and first airline are the same`, async function () {

    let flightAppOwner = await config.flightSuretyApp.getOwner.call();
    let flightDataOwner = await config.flightSuretyData.getOwner.call();
    assert.equal(flightAppOwner, config.firstAirline, "First airline should own FlighSuretyApp contract instance");
    assert.equal(flightDataOwner, config.firstAirline, "First airline should own FlighSuretyApp contract instance");

  });

  it(`Application has correct initial isOperational() value`, async function () {
    
    // Get operating status
    let status = await config.flightSuretyData.isOperational.call();
    assert.equal(status, true, "Incorrect initial operating status value");

  });

  it(`Application can block access to setOperatingStatus() for non-Contract Owner account`, async function () {

      // Ensure that access is denied for non-Contract Owner account
      let accessDenied = false;
      try 
      {
          await config.flightSuretyData.setOperatingStatus(false, { from: config.testAddresses[2] });
      }
      catch(e) {
          accessDenied = true;
      }
      assert.equal(accessDenied, true, "Access not restricted to Contract Owner");
            
  });

  
  it(`Application can allow access to setOperatingStatus() for Contract Owner account`, async function () {

      // Ensure that access is allowed for Contract Owner account
      let accessDenied = false;
      try 
      {
          await config.flightSuretyData.setOperatingStatus(false, { from: config.owner });
      }
      catch(e) {
          console.log(e.message);
          accessDenied = true;
      }
      assert.equal(accessDenied, false, "Access not restricted to Contract Owner");
      try 
      {
          await config.flightSuretyData.setOperatingStatus(true, { from: config.owner });
      }
      catch(e) {
          console.log(e.message);
      }
      let status = await config.flightSuretyData.isOperational.call();
      assert.equal(status, true, "Incorrect initial operating status value");

      
  });


  it('An airline cannot register an Airline using registerAirline() if it is not funded', async () => {
    
    // ARRANGE
    let newAirline = accounts[1];
    let funded_pre = await config.flightSuretyApp.isAirlineFunded.call(config.firstAirline);
    assert.equal(funded_pre, false, "Before calling register, first airline is funded should be false");
    let registered_pre = await config.flightSuretyApp.isAirlineRegistered.call(config.firstAirline);
    assert.equal(registered_pre, true, "Before calling register, first airline is registered should be true");
    let nominated_pre = await config.flightSuretyApp.isAirlineNominated.call(config.firstAirline);
    assert.equal(nominated_pre, true, "Before calling register, first airline is nominated should be true");
    let new_funded_pre = await config.flightSuretyApp.isAirlineFunded.call(newAirline);
    assert.equal(new_funded_pre, false, "Before calling register, new airline is funded should be false");
    let new_registered_pre = await config.flightSuretyApp.isAirlineRegistered.call(newAirline);
    assert.equal(new_registered_pre, false, "Before calling register, new airline is registered should be false");
    let new_nominated_pre = await config.flightSuretyApp.isAirlineNominated.call(newAirline);
    assert.equal(new_nominated_pre, false, "Before calling register, new airline is nominated should be false");

    // ACT
    try {
        await config.flightSuretyApp.registerAirline(newAirline, {from: config.firstAirline});
    }
    catch(e) {
        console.log(e.message);
    }
    let result = await config.flightSuretyApp.isAirlineRegistered.call(newAirline);

    // ASSERT
    let new_funded_post = await config.flightSuretyApp.isAirlineFunded.call(newAirline);
    assert.equal(new_funded_post, false, "After calling register, new airline is funded should be false");
    let new_registered_post = await config.flightSuretyApp.isAirlineRegistered.call(newAirline);
    assert.equal(new_registered_post, false, "After calling register, new airline is registered should be false");
    let new_nominated_post = await config.flightSuretyApp.isAirlineNominated.call(newAirline);
    assert.equal(new_nominated_post, false, "After calling register, new airline is nominated should be false");

  });

  it('An airline that sends less then 10 ether does not fund', async () => {
    // ARRANGE
    let funded_pre = await config.flightSuretyApp.isAirlineFunded.call(config.firstAirline);
    assert.equal(funded_pre, false, "Before calling fund, first airline is funded should be false");
    let registered_pre = await config.flightSuretyApp.isAirlineRegistered.call(config.firstAirline);
    assert.equal(registered_pre, true, "Before calling fund, first airline is registered should be true");
    let nominated_pre = await config.flightSuretyApp.isAirlineNominated.call(config.firstAirline);
    assert.equal(nominated_pre, true, "Before calling fund, first airline is nominated should be true");
    
    // ACT
    try {
        await config.flightSuretyApp.fundAirline({from: config.firstAirline, value: web3.utils.toWei('5', 'ether')});
    }
    catch(e) {
        console.log(e.message);
    }
    let result = await config.flightSuretyApp.isAirlineFunded.call(config.firstAirline);

    // ASSERT
    let funded_post = await config.flightSuretyApp.isAirlineFunded.call(config.firstAirline);
    assert.equal(funded_post, false, "After calling fund with 5 ether, first airline is funded should be false");
    let registered_post = await config.flightSuretyApp.isAirlineRegistered.call(config.firstAirline);
    assert.equal(registered_post, true, "After calling fund with 5 ether, first airline is registered should be true");
    let nominated_post = await config.flightSuretyApp.isAirlineNominated.call(config.firstAirline);
    assert.equal(nominated_post, true, "After calling fund with 5 ether, first airline is nominated should be true");

  });

  
  it('An airline can fund if it sends more then 10 ether.', async () => {
    // ARRANGE
    let funded_pre = await config.flightSuretyApp.isAirlineFunded.call(config.firstAirline);
    assert.equal(funded_pre, false, "Before calling fund, first airline is funded should be false");
    let registered_pre = await config.flightSuretyApp.isAirlineRegistered.call(config.firstAirline);
    assert.equal(registered_pre, true, "Before calling fund, first airline is registered should be true");
    let nominated_pre = await config.flightSuretyApp.isAirlineNominated.call(config.firstAirline);
    assert.equal(nominated_pre, true, "Before calling fund, first airline is nominated should be true");
    
    // ACT
    try {
        await config.flightSuretyApp.fundAirline({from: config.firstAirline, value: web3.utils.toWei('12', 'ether')});
    }
    catch(e) {
        console.log(e.message);
    }

    // ASSERT
    let funded_post = await config.flightSuretyApp.isAirlineFunded.call(config.firstAirline);
    assert.equal(funded_post, true, "After calling fund with 12 ether, first airline is funded should be true");
    let registered_post = await config.flightSuretyApp.isAirlineRegistered.call(config.firstAirline);
    assert.equal(registered_post, true, "After calling fund with 12 ether, first airline is registered should be true");
    let nominated_post = await config.flightSuretyApp.isAirlineNominated.call(config.firstAirline);
    assert.equal(nominated_post, true, "After calling fund with 12 ether, first airline is nominated should be true");

  });

  it('A funded airline can register an Airline using registerAirline()', async () => {
    // At this point in the test airline 1 is funded
    // ARRANGE
    let newAirline = accounts[1];

    let funded_pre = await config.flightSuretyApp.isAirlineFunded.call(config.firstAirline);
    assert.equal(funded_pre, true, "Before calling register, first airline is funded should be true");
    let registered_pre = await config.flightSuretyApp.isAirlineRegistered.call(config.firstAirline);
    assert.equal(registered_pre, true, "Before calling register, first airline is registered should be true");
    let nominated_pre = await config.flightSuretyApp.isAirlineNominated.call(config.firstAirline);
    assert.equal(nominated_pre, true, "Before calling register, first airline is nominated should be true");
    let new_funded_pre = await config.flightSuretyApp.isAirlineFunded.call(newAirline);
    assert.equal(new_funded_pre, false, "Before calling register, new airline is funded should be false");
    let new_registered_pre = await config.flightSuretyApp.isAirlineRegistered.call(newAirline);
    assert.equal(new_registered_pre, false, "Before calling register, new airline is registered should be false");
    let new_nominated_pre = await config.flightSuretyApp.isAirlineNominated.call(newAirline);
    assert.equal(new_nominated_pre, false, "Before calling register, new airline is nominated should be false");

    // ACT
    try {
        await config.flightSuretyApp.registerAirline(newAirline, {from: config.firstAirline});
    }
    catch(e) {
        console.log(e.message);
    }

    // ASSERT
    let new_funded_post = await config.flightSuretyApp.isAirlineFunded.call(newAirline);
    assert.equal(new_funded_post, false, "After calling register, new airline is funded should be false");
    let new_registered_post = await config.flightSuretyApp.isAirlineRegistered.call(newAirline);
    assert.equal(new_registered_post, true, "After calling register, new airline is registered should be true");
    let new_nominated_post = await config.flightSuretyApp.isAirlineNominated.call(newAirline);
    assert.equal(new_nominated_post, true, "After calling register, new airline is nominated should be true");

  });


  it('Next two registered airlines are auto registered and nominated', async () => {
    // At this point in the test airline 1 is funded
    // ARRANGE
    let registeredAirlineCount = await config.flightSuretyApp.getRegisteredAirlineCount.call();
    assert.equal(registeredAirlineCount, 2, "Total airlines registered should be 2");

    let thirdAirline = accounts[2];
    let fourthAirline = accounts[3];

    let third_funded_pre = await config.flightSuretyApp.isAirlineFunded.call(thirdAirline);
    assert.equal(third_funded_pre, false, "Before registering, third airline is funded should be false");
    let third_registered_pre = await config.flightSuretyApp.isAirlineRegistered.call(thirdAirline);
    assert.equal(third_registered_pre, false, "Before registering, third airline is registered should be false");
    let third_nominated_pre = await config.flightSuretyApp.isAirlineNominated.call(thirdAirline);
    assert.equal(third_nominated_pre, false, "Before registering, third airline is nominated should be false");
    let fourth_funded_pre = await config.flightSuretyApp.isAirlineFunded.call(fourthAirline);
    assert.equal(fourth_funded_pre, false, "Before registering, fourth is funded should be false");
    let fourth_registered_pre = await config.flightSuretyApp.isAirlineRegistered.call(fourthAirline);
    assert.equal(fourth_registered_pre, false, "Before registering, fourth airline is registered should be false");
    let fourth_nominated_pre = await config.flightSuretyApp.isAirlineNominated.call(fourthAirline);
    assert.equal(fourth_nominated_pre, false, "Before registering, fourth airline is nominated should be false");

    // ACT
    try {
        await config.flightSuretyApp.registerAirline(thirdAirline, {from: config.firstAirline});
        await config.flightSuretyApp.registerAirline(fourthAirline, {from: config.firstAirline});
    }
    catch(e) {
        console.log(e.message);
    }

    // ASSERT
    let third_funded_post = await config.flightSuretyApp.isAirlineFunded.call(thirdAirline);
    assert.equal(third_funded_post, false, "After calling register, third airline is funded should be false");
    let third_registered_post = await config.flightSuretyApp.isAirlineRegistered.call(thirdAirline);
    assert.equal(third_registered_post, true, "After calling register, third airline is registered should be true");
    let third_nominated_post = await config.flightSuretyApp.isAirlineNominated.call(thirdAirline);
    assert.equal(third_nominated_post, true, "After calling register, third airline is nominated should be true");
    let fourth_funded_post = await config.flightSuretyApp.isAirlineFunded.call(fourthAirline);
    assert.equal(fourth_funded_post, false, "After calling register, fourth airline is funded should be false");
    let fourth_registered_post = await config.flightSuretyApp.isAirlineRegistered.call(fourthAirline);
    assert.equal(fourth_registered_post, true, "After calling register, fourth airline is registered should be true");
    let fourth_nominated_post = await config.flightSuretyApp.isAirlineNominated.call(fourthAirline);
    assert.equal(fourth_nominated_post, true, "After calling register, fourth airline is nominated should be true");

  });

  it('Fifth registered airlines is not registered but is nominated', async () => {
    // At this point in the test airline 1 is funded
    // ARRANGE
    let fifthAirline = accounts[4];

    let registeredAirlineCount = await config.flightSuretyApp.getRegisteredAirlineCount();
    assert.equal(registeredAirlineCount, 4, "Total airlines registered should be 4");

    let fifth_funded_pre = await config.flightSuretyApp.isAirlineFunded.call(fifthAirline);
    assert.equal(fifth_funded_pre, false, "Before registering, fifth airline is funded should be false");
    let fifth_registered_pre = await config.flightSuretyApp.isAirlineRegistered.call(fifthAirline);
    assert.equal(fifth_registered_pre, false, "Before registering, fifth airline is registered should be false");
    let fifth_nominated_pre = await config.flightSuretyApp.isAirlineNominated.call(fifthAirline);
    assert.equal(fifth_nominated_pre, false, "Before registering, fifth airline is nominated should be false");

    // ACT
    try {
        await config.flightSuretyApp.registerAirline(fifthAirline, {from: config.firstAirline});
    }
    catch(e) {
        console.log(e.message);
    }

    // ASSERT
    let fifth_funded_post = await config.flightSuretyApp.isAirlineFunded.call(fifthAirline);
    assert.equal(fifth_funded_post, false, "After calling register, fifth airline is funded should be false");
    let fifth_registered_post = await config.flightSuretyApp.isAirlineRegistered.call(fifthAirline);
    assert.equal(fifth_registered_post, false, "After calling register, fifth airline is registered should be false");
    let fifth_nominated_post = await config.flightSuretyApp.isAirlineNominated.call(fifthAirline);
    assert.equal(fifth_nominated_post, true, "After calling register, fifth airline is nominated should be true");

  });

  it('Nominate the fifth airline a second time so its registered', async () => {
    // Fund the first 4 airlines
    // ARRANGE
    let firstAirline = accounts[0];
    let secondAirline = accounts[1];
    let fifthAirline = accounts[4];

    try {
        await config.flightSuretyApp.fundAirline({from: secondAirline, value: web3.utils.toWei('10', 'ether')});
    }
    catch(e) {
        console.log(e.message);
    }

    let first_funded = await config.flightSuretyApp.isAirlineFunded.call(firstAirline);
    let second_funded = await config.flightSuretyApp.isAirlineFunded.call(secondAirline);
    assert.equal(first_funded, true, "First airline should be funded");
    assert.equal(second_funded, true, "Second airline should be funded");

    let registeredAirlineCount = await config.flightSuretyApp.getRegisteredAirlineCount.call();
    assert.equal(registeredAirlineCount, 4, "Total airlines registered should be 4");

    let fifth_registered = await config.flightSuretyApp.isAirlineRegistered.call(fifthAirline);
    assert.equal(fifth_registered, false, "Fifth should not be registered yet");


    // ACT
    try {
        await config.flightSuretyApp.registerAirline(fifthAirline, {from: secondAirline});
    }
    catch(e) {
        console.log(e.message);
    }
    fifth_registered = await config.flightSuretyApp.isAirlineRegistered.call(fifthAirline);
    assert.equal(fifth_registered, true, "Fifth should not be registered after second nomination");

    // ASSERT
    let fifth_funded_post = await config.flightSuretyApp.isAirlineFunded.call(fifthAirline);
    assert.equal(fifth_funded_post, false, "After calling register, fifth airline is funded should be false");
    let fifth_registered_post = await config.flightSuretyApp.isAirlineRegistered.call(fifthAirline);
    assert.equal(fifth_registered_post, true, "After calling register, fifth airline is registered should be true");
    let fifth_nominated_post = await config.flightSuretyApp.isAirlineNominated.call(fifthAirline);
    assert.equal(fifth_nominated_post, true, "After calling register, fifth airline is nominated should be true");

  });

  it('Fund and register up to seven airlines', async () => {
    // Fund the first 4 airlines
    // ARRANGE
    let firstAirline = accounts[0];
    let secondAirline = accounts[1];
    let thirdAirline = accounts[2];
    let fourthAirline = accounts[3];
    let fifthAirline = accounts[4];
    let sixthAirline = accounts[5];
    let seventhAirline = accounts[6];

    let registeredAirlineCount = await config.flightSuretyApp.getRegisteredAirlineCount();
    assert.equal(registeredAirlineCount, 5, "Total airlines registered should be 5");

    await config.flightSuretyApp.fundAirline({from: thirdAirline, value: web3.utils.toWei('10', 'ether')});
    await config.flightSuretyApp.fundAirline({from: fourthAirline, value: web3.utils.toWei('10', 'ether')});
    await config.flightSuretyApp.fundAirline({from: fifthAirline, value: web3.utils.toWei('10', 'ether')});

    // ACT
    await config.flightSuretyApp.registerAirline(sixthAirline, {from: firstAirline});
    sixth_registered = await config.flightSuretyApp.isAirlineRegistered.call(sixthAirline);
    assert.equal(sixth_registered, false, "Sixth should not be registered after first nomination");
    
    await config.flightSuretyApp.registerAirline(sixthAirline, {from: secondAirline});
    sixth_registered = await config.flightSuretyApp.isAirlineRegistered.call(sixthAirline);
    assert.equal(sixth_registered, true, "Sixth should be registered after second nomination");   

    await config.flightSuretyApp.fundAirline({from: sixthAirline, value: web3.utils.toWei('10', 'ether')});

    registeredAirlineCount = await config.flightSuretyApp.getRegisteredAirlineCount.call();
    assert.equal(registeredAirlineCount, 6, "Total airlines registered should be 6");

    await config.flightSuretyApp.registerAirline(seventhAirline, {from:fourthAirline});
    seventh_registered = await config.flightSuretyApp.isAirlineRegistered.call(seventhAirline);
    assert.equal(seventh_registered, false, "Seventh should not be registered after first nomination");
    
    await config.flightSuretyApp.registerAirline(seventhAirline, {from: fifthAirline});
    seventh_registered = await config.flightSuretyApp.isAirlineRegistered.call(seventhAirline);
    assert.equal(seventh_registered, false, "Seventh should not registered after second nomination");   
    
    await config.flightSuretyApp.registerAirline(seventhAirline, {from: sixthAirline});
    seventh_registered = await config.flightSuretyApp.isAirlineRegistered.call(seventhAirline);
    assert.equal(seventh_registered, true, "Seventh should be registered after third nomination");

    // ASSERT
    let seventh_funded_post = await config.flightSuretyApp.isAirlineFunded.call(seventhAirline);
    assert.equal(seventh_funded_post, false, "Seventh airline is funded should be false");
    let seventh_registered_post = await config.flightSuretyApp.isAirlineRegistered.call(seventhAirline);
    assert.equal(seventh_registered_post, true, "Seventh airline is registered should be true");
    let seventh_nominated_post = await config.flightSuretyApp.isAirlineNominated.call(seventhAirline);
    assert.equal(seventh_nominated_post, true, "Seventh airline is nominated should be true");

  });

  it('Register four flights and insure one passenger', async () => {
    // Fund the first 4 airlines
    // ARRANGE
    let firstAirline = accounts[0];
    let secondAirline = accounts[1];
    let thirdAirline = accounts[2];
    let passenger1 = accounts[7];

    let f1_flight = '1111';
    let f1_timestamp = Date.now();
    let f1_airline = firstAirline;
    
    let f2_flight = '2222';
    let f2_timestamp = Date.now();
    let f2_airline = secondAirline;

    let f3_flight = '3333';
    let f3_timestamp = Date.now();
    let f3_airline = thirdAirline;

    let f4_flight = '4444';
    let f4_timestamp = 1563316732352;
    let f4_airline = firstAirline;

    let f1_registered = await config.flightSuretyApp.isFlightRegistered.call(f1_airline,f1_flight,f1_timestamp);
    assert.equal(f1_registered, false, "first flight should not be registered yet");
    try {
        await config.flightSuretyApp.registerFlight(f1_flight,f1_timestamp, {from: f1_airline});
    }
    catch(e) {
        console.log(e.message);
    }
    f1_registered = await config.flightSuretyApp.isFlightRegistered.call(f1_airline,f1_flight,f1_timestamp);
    assert.equal(f1_registered, true, "first flight should now be registered");
    
    let f2_registered = await config.flightSuretyApp.isFlightRegistered.call(f2_airline,f2_flight,f2_timestamp);
    assert.equal(f2_registered, false, "second flight should not be registered yet");
    try {
        await config.flightSuretyApp.registerFlight(f2_flight,f2_timestamp, {from: f2_airline});
    }
    catch(e) {
        console.log(e.message);
    }
    f2_registered = await config.flightSuretyApp.isFlightRegistered.call(f2_airline,f2_flight,f2_timestamp);
    assert.equal(f2_registered, true, "second flight should now be registered");

    let f3_registered = await config.flightSuretyApp.isFlightRegistered.call(f3_airline,f3_flight,f3_timestamp);
    assert.equal(f3_registered, false, "third flight should not be registered yet");
    try {
        await config.flightSuretyApp.registerFlight(f3_flight,f3_timestamp, {from: f3_airline});
    }
    catch(e) {
        console.log(e.message);
    }
    f3_registered = await config.flightSuretyApp.isFlightRegistered.call(f3_airline,f3_flight,f3_timestamp);
    assert.equal(f3_registered, true, "third flight should now be registered");

    let f4_registered = await config.flightSuretyApp.isFlightRegistered.call(f4_airline,f4_flight,f4_timestamp);
    assert.equal(f4_registered, false, "fourth flight should not be registered yet");
    try {
        await config.flightSuretyApp.registerFlight(f4_flight,f4_timestamp, {from: f4_airline});
    }
    catch(e) {
        console.log(e.message);
    }
    f4_registered = await config.flightSuretyApp.isFlightRegistered.call(f4_airline,f4_flight,f4_timestamp);
    assert.equal(f4_registered, true, "fourth flight should now be registered");

    let passenger1_insured = await config.flightSuretyApp.isPassengerInsured.call(f4_airline,f4_flight,f4_timestamp, {from: passenger1});
    assert.equal(passenger1_insured, false, "passenger 1 should not be insured yet");
    try {
        await config.flightSuretyApp.InsureFlight(f4_airline,f4_flight,f4_timestamp, {from: passenger1, value: web3.utils.toWei('1', 'ether')});
    }
    catch(e) {
        console.log(e.message);
    }
    passenger1_insured = await config.flightSuretyApp.isPassengerInsured.call(f4_airline,f4_flight,f4_timestamp, {from: passenger1});
    assert.equal(passenger1_insured, true, "passenger 1 should be insured now");
    
  });

  it('Passenger cannot register for the same flight twice', async () => {
    let firstAirline = accounts[0];
    let passenger1 = accounts[7];
    let f4_flight = '4444';
    let f4_timestamp = 1563316732352;
    let f4_airline = firstAirline;
    let doubleInsureAllowed = true;

    let passenger1_insured = await config.flightSuretyApp.isPassengerInsured.call(f4_airline,f4_flight,f4_timestamp, {from: passenger1});
    assert.equal(passenger1_insured, true, "passenger 1 should already be insured for this flight");
    try {
        await config.flightSuretyApp.InsureFlight(f4_airline,f4_flight,f4_timestamp, {from: passenger1, value: web3.utils.toWei('1', 'ether')});
    }
    catch(e) {
        console.log(e.message);
        doubleInsureAllowed = false;
    }
    assert.equal(doubleInsureAllowed, false, "passenger 1 should not be able to insure twice for the same flight");

  });


  it('If flight is late credit passenger', async () => {
    let firstAirline = accounts[0];
    let passenger1 = accounts[7];
    let f4_flight = '4444';
    let f4_timestamp = 1563316732352;
    let f4_airline = firstAirline;
    let callpaywith0balance = true;

    try {
        await config.flightSuretyApp.withdrawCredits({from: passenger1});
    }
    catch(e){
        console.log(e.message);
        callpaywith0balance = false;
    }
    assert.equal(callpaywith0balance, false, "Should not be able to call pay with no credit balance");

    let passenger1_balance = await config.flightSuretyApp.getPassengerCreditBalance.call({from: passenger1});
    assert.equal(passenger1_balance, 0, "passenger 1 should have no credit");

    try {
        await config.flightSuretyApp.forceProcessFlightStatus(f4_airline, f4_flight, f4_timestamp, config.STATUS_CODE_LATE_AIRLINE);
    }
    catch(e){
        console.log(e.message);
    }

    try {
        await config.flightSuretyApp.withdrawCredits({from: passenger1});
    }
    catch(e){
        console.log(e.message);
    }
    passenger1_balance = await config.flightSuretyApp.getPassengerCreditBalance.call({from: passenger1});
    assert.equal(passenger1_balance, 0, "passenger should have 0 ether after calling pay");

  });


  it('can register oracles', async () => {
    
    // ARRANGE
    let fee = await config.flightSuretyApp.REGISTRATION_FEE.call();

    // ACT
    for(let a=1; a<TEST_ORACLES_COUNT; a++) {      
      await config.flightSuretyApp.registerOracle({ from: accounts[a], value: fee });
      let result = await config.flightSuretyApp.getMyIndexes.call({from: accounts[a]});
      console.log(`Oracle Registered: ${result[0]}, ${result[1]}, ${result[2]}`);
    }
  });

  it('can request flight status', async () => {
    
    // ARRANGE
    let flight = '4444'; // Course number
    let timestamp = 1563316732352;

    // Submit a request for oracles to get status information for a flight
    try{
        await config.flightSuretyApp.fetchFlightStatus(config.firstAirline, flight, timestamp);
    }
    catch(e){
        console.log(e.message);
    }
    // ACT

    // Since the Index assigned to each test account is opaque by design
    // loop through all the accounts and for each account, all its Indexes (indices?)
    // and submit a response. The contract will reject a submission if it was
    // not requested so while sub-optimal, it's a good test of that feature
    for(let a=1; a<TEST_ORACLES_COUNT; a++) {

      // Get oracle information
      let oracleIndexes = await config.flightSuretyApp.getMyIndexes.call({ from: accounts[a]});
      for(let idx=0;idx<3;idx++) {

        try {
          // Submit a response...it will only be accepted if there is an Index match
          await config.flightSuretyApp.submitOracleResponse(oracleIndexes[idx], config.firstAirline, flight, timestamp, config.STATUS_CODE_ON_TIME, { from: accounts[a] });

        }
        catch(e) {
          // Enable this when debugging
          // console.log(e.message);
          // console.log('\nError', idx, oracleIndexes[idx].toNumber(), flight, timestamp);
        }

      }
    }


  });

});
