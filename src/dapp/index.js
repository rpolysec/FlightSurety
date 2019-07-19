
import DOM from './dom';
import Contract from './contract';
import './flightsurety.css';
import { callbackify } from 'util';
import { ContractModuleFactory } from 'web3-eth-contract';

(async() => {

    let contract = new Contract('localhost', () => {

        // set authorized caller
        contract.authorizeAppToData((error, result) => {
            console.log(error,result);
        });

        // Read transaction
        contract.isOperational((error, result) => {
            console.log(error,result);
            let status = DOM.elid('operational-status');
            status.innerText = result;
        });

        DOM.elid('btn-operational-status').addEventListener('click', () => {
            let status = DOM.elid('operational-status');
            contract.isOperational((error, result) => {
                if (error!=false){
                    try{
                        result = parseErrorMessage(error);
                    }
                    catch(e){
                        console.log(error);
                    }
                    console.log(result);
                }
                status.innerText = result;
            });
        })

        DOM.elid('btn-refresh-status').addEventListener('click', () => {
            refreshAccountInfo();
        })

        DOM.elid('available-accounts').addEventListener('change', () => {
            refreshAccountInfo();
        })

        DOM.elid('btn-operational-toggle').addEventListener('click', () => {
            let status = DOM.elid('operational-status');
            let newstatus = true;
            if(status.innerText == "true"){
                newstatus = false;
            }
            contract.toggleStatus(newstatus, (error, result) => {
                contract.isOperational((error, result) => {
                    if (error!=false){
                        try{
                            result = parseErrorMessage(error);
                        }
                        catch(e){
                            console.log(error);
                        }
                        console.log(result);
                    }
                    status.innerText = result;
                });
            });
        })
        

        // fill in selection menus
        let airlineselect = DOM.elid("airline");
        for(var key in contract.airlineDict) {
            airlineselect.add(DOM.makeElement("option", {innerText:key}));
        }

        let accountselect = DOM.elid("available-accounts");
        let i = 0;
        for(i=0;i<contract.availableAccounts.length; i++) {
            accountselect.add(DOM.makeElement("option", {innerText:contract.availableAccounts[i]}));
        }

        let flightselect = DOM.elid("flight-select");
        for(i=0;i<contract.flightsHardCoded.length; i++) {
            flightselect.add(DOM.makeElement("option", {innerText:contract.flightsHardCoded[i]}));
        }
        
        refreshAccountInfo();
 
        // User-submitted transaction
        DOM.elid('submit-oracle').addEventListener('click', () => {
            let tuple = DOM.elid('registered-flight-select').value;
            // Write transaction
            contract.fetchFlightStatus(tuple, (error, result) => {
                displayInsuranceMessage('Status', error, `${result.flight} , ${result.airline}, ${result.timestamp}`);
            });
        })
        
       DOM.elid('btn-flights-register').addEventListener('click', () => {
           let flightId = DOM.elid('flight-select').value;
            contract.registerFlight(flightId, (error, result) => {
                displayFlightMessage('Register: ', error,result);
                let flightselect = DOM.elid("registered-flight-select");
                var i;
                for(i = flightselect.options.length - 1 ; i >= 0 ; i--)
                {
                    flightselect.remove(i);
                }
                for(i=0;i<contract.flightsAvailable.length; i++) {
                    flightselect.add(DOM.makeElement("option", {innerText:contract.flightsAvailable[i]}));
                }
            });
 
        })

        DOM.elid('btn-purchase-insurance').addEventListener('click', () => {
            let tuple = DOM.elid('registered-flight-select').value;
            let premium = DOM.elid('premium').value;
            console.log(premium);
             contract.insureFlight(tuple, premium, (error, result) => {
                 displayInsuranceMessage('Insure: ', error,result);
             });
  
         })

         DOM.elid('btn-withdraw-funds').addEventListener('click', () => {
            let tuple = DOM.elid('registered-flight-select').value;
             contract.withdrawCredits((error, result) => {
                 displayInsuranceMessage('Withdraw: ', error,result);
             });
  
         })

        DOM.elid('btn-airline-register').addEventListener('click', () => {
            let airline = contract.airlineDict[DOM.elid('airline').value];
            // Write transaction
            contract.registerAirline(airline, (error, result) => {
                displayAirlineMessage('Register:', error,result);
            });
            refreshAccountInfo();
        })

        DOM.elid('btn-register-oracles').addEventListener('click', () => {
            let count = DOM.elid('oracle-count').value;
            // Write transaction
            let i=0;
            for(i=0;i<count;i++){
                contract.registerOracles(i, (error, result) => {
                    console.log(result);
                    displayInsuranceMessage('Registered:', error,result);
                });
            }
            refreshAccountInfo();
        })

        DOM.elid('btn-airline-fund').addEventListener('click', () => {
            let value = DOM.elid('fund-amount').value;
            // Write transaction
            contract.fundAirline(value,(error, result) => {
                displayAirlineMessage('Fund:',error,result);
            });
            refreshAccountInfo();
        })

        function refreshAccountInfo(){
            contract.activeAccount = DOM.elid('available-accounts').value;
                    DOM.elid('acc-address').innerText = contract.activeAccount;
                    contract.isAirlineRegistered(contract.activeAccount, (error, result) => {
                        if (error!=false){
                            try{
                                result = parseErrorMessage(error);
                            }
                            catch(e){
                                console.log(error);
                            }
                            console.log(result);
                        }
                        DOM.elid('acc-registered').innerText = result;
                        //console.log(result);
                    });
                    contract.isAirlineFunded((error, result) => {
                        if (error!=false){
                            try{
                                result = parseErrorMessage(error);
                            }
                            catch(e){
                                console.log(error);
                            }
                            console.log(result);
                        }
                        DOM.elid('acc-funded').innerText = result;
                        //console.log(result);
                    });
                    contract.isAirlineNominated((error, result) => {
                        if (error!=false){
                            try{
                                result = parseErrorMessage(error);
                            }
                            catch(e){
                                console.log(error);
                            }
                            console.log(result);
                        }
                        DOM.elid('acc-nominated').innerText = result;
                        //console.log(result);
                    });
                    contract.getPassengerCreditBalance((error, result) => {
                        if (error!=false){
                            try{
                                result = parseErrorMessage(error);
                            }
                            catch(e){
                                console.log(error);
                            }
                            console.log(result);
                        }
                        DOM.elid('acc-credit').innerText = result;
                        //console.log(result);
                    });
                    web3.eth.getBalance(contract.activeAccount, (error, result) =>
                    {
                        if (error!=false){
                            try{
                                result = parseErrorMessage(error);
                            }
                            catch(e){
                                console.log(error);
                            }
                            console.log(result);
                        }
                        DOM.elid('acc-balance').innerText = result;
                        //console.log(result);
                    });
                    DOM.elid('acc-owner').innerText = contract.owner;
        }
    }); // close new contract
})(); //call the async function


function displayAirlineMessage(label, error, result){
    
    let displayDiv = DOM.elid("airline-messages");
    let section = DOM.section();
    let row = section.appendChild(DOM.div({className:'row'}));
    row.appendChild(DOM.div({className: 'col-sm-1 field'}, label));
    if (error!=false){
        try{
            result = parseErrorMessage(error);
        }
        catch(e){
            console.log(error);
        }
        console.log(result);
    }
    row.appendChild(DOM.div({className: 'col-sm-8 field-value'}, String(result)));
    section.appendChild(row);
    displayDiv.append(section);
    if(displayDiv.childElementCount > 3){
        displayDiv.removeChild(displayDiv.firstChild);
    }
}

function displayFlightMessage(label, error, result){
    
    let displayDiv = DOM.elid("flight-messages");
    let section = DOM.section();
    let row = section.appendChild(DOM.div({className:'row'}));
    row.appendChild(DOM.div({className: 'col-sm-1 field'}, label));
    if (error!=false){
        try{
            result = parseErrorMessage(error);
        }
        catch(e){
            console.log(error);
        }
        console.log(result);
    }
    row.appendChild(DOM.div({className: 'col-sm-8 field-value'}, String(result)));
    section.appendChild(row);
    displayDiv.append(section);
    if(displayDiv.childElementCount > 3){
        displayDiv.removeChild(displayDiv.firstChild);
    }
}

function displayInsuranceMessage(label, error, result){
    
    let displayDiv = DOM.elid("insurance-messages");
    let section = DOM.section();
    let row = section.appendChild(DOM.div({className:'row'}));
    row.appendChild(DOM.div({className: 'col-sm-1 field'}, label));
    if (error!=false){
        try{
            result = parseErrorMessage(error);
        }
        catch(e){
            console.log(error);
        }
        console.log(result);
    }
    row.appendChild(DOM.div({className: 'col-sm-8 field-value'}, String(result)));
    section.appendChild(row);
    displayDiv.append(section);
    if(displayDiv.childElementCount > 3){
        displayDiv.removeChild(displayDiv.firstChild);
    }
}

function parseErrorMessage(error){
    return JSON.parse(String(error).substring(String(error).indexOf('{'))).message;
}