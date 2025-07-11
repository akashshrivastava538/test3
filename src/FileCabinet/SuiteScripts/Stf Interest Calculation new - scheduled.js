function LoadSearchfordeposit(type, name) {
    try {
        var datestf = new Date();
        datestf = nlapiDateToString(datestf);
        var results = nlapiSearchRecord("salesorder", 'customsearchstf_deposit_calc',
            [
            ],
            [

            ]
        );

        var payload = JSON.stringify({
            fileName: 'stfInterestCalc_depositSearch.json',
            data: results
        })

        var loggerResult = nlapiRequestRestlet(
            'customscript_json_logger_util_ssv2',
            'customdeploy_json_logger_util_ssv2',
            {},
            payload,
            { 'Content-Type': 'application/json' },
            'POST'
        );
       
        nlapiLogExecution('debug', 'LoadSearchfordeposit - loggerResult', JSON.stringify(loggerResult));

        if (results && results.length > 0) {
            for (var i = 0; i < results.length; i++) {
                for (var i in results) {
                    var results1 = results[i];
                    var columns1 = results1.getAllColumns();
                    var procurementchargesold = results1.getValue(columns1[1]);
                    var stfcustomer = results1.getValue(columns1[2]);
                    var penalinterest = nlapiLookupField("customer", stfcustomer, "custentity_sam_penal_interest");
                    var firstpaymentdate = nlapiLookupField("customer", stfcustomer, "custentity_first_vend_pymt_date");
                    var depositamount = getDepositAmount(stfcustomer, datestf, firstpaymentdate)
                    var extprocurementcharges = results1.getValue(columns1[4]);
                    var contractextdate = nlapiStringToDate(results1.getValue(columns1[3]));
                    var salesmargin = results1.getValue(columns1[5]);
                    var validfromdate = nlapiStringToDate(results1.getValue(columns1[7]));
                    var validtodate = nlapiStringToDate(results1.getValue(columns1[8]));

                    nlapiLogExecution('debug', 'stfcustomer', stfcustomer);
                    nlapiLogExecution('debug', 'procurementchargesold', procurementchargesold);
                    nlapiLogExecution('debug', 'penalinterest', penalinterest);
                    nlapiLogExecution('debug', 'firstpaymentdate', firstpaymentdate);
                    nlapiLogExecution('debug', 'datestf', datestf);
                    nlapiLogExecution('debug', 'depositamount - one', depositamount);
                    nlapiLogExecution('debug', 'extprocurementcharges', extprocurementcharges);
                    nlapiLogExecution('debug', 'contractextdate', contractextdate);
                    nlapiLogExecution('debug', 'salesmargin', salesmargin);




                    var paymentamount = 0;
                    var interestamount = 0;
                    var invoiceamount = 0;
                    var stfcustomernew = 0;
                    var depositamountwithbankfund = 0;
                    var currentdate = new Date();
                    var newdatestf = nlapiStringToDate(datestf);
                    var bankfundamount = parseFloat(getbankfundingamount(firstpaymentdate, stfcustomer, datestf));

                    if ((newdatestf >= contractextdate) && bankfundamount > 0) {
                        var procurementcharges = extprocurementcharges;
                    }
                    else if ((newdatestf < contractextdate) && bankfundamount > 0) {
                        var procurementcharges = procurementchargesold;
                    }
                    else if ((newdatestf >= validtodate) && bankfundamount > 0) {
                        var procurementcharges = penalinterest;
                    }

                    nlapiLogExecution('debug', 'bankfundamount', bankfundamount);
                    nlapiLogExecution('debug', 'procurementcharges', procurementcharges);


                    var invoiceresults = GetInvoiceAmount(stfcustomer, datestf, firstpaymentdate);
                    if (invoiceresults && invoiceresults.length > 0) {
                        for (var l = 0; l < 1; l++) {
                            var invoiceresults1 = invoiceresults[l];
                            var invoicecolumns1 = invoiceresults1.getAllColumns();
                            invoiceamount += parseFloat(invoiceresults1.getValue(invoicecolumns1[1]));
                        }
                    }
                    if (!depositamount) {
                        depositamount = 0;
                    }
                    var custpymntamount = getPaymentAmount(stfcustomer, datestf, firstpaymentdate)

                    if (custpymntamount > 0 && custpymntamount != NaN) {
                        depositamount = depositamount + custpymntamount;
                    }
                    if (bankfundamount > 0 && bankfundamount != NaN) {
                        depositamountwithbankfund = depositamount + bankfundamount;
                    }


                    nlapiLogExecution('debug', 'custpymntamount', custpymntamount);
                    nlapiLogExecution('debug', 'depositamountwithbankfund', depositamountwithbankfund);


                    var interestresults = GetPreviousmonthInterest(stfcustomer, datestf, firstpaymentdate);
                    nlapiLogExecution('debug', 'interestresults', interestresults);

                    if (interestresults && interestresults.length > 0) {
                        nlapiLogExecution('debug', 'interestresults.length', interestresults.length);

                        for (var k = 0; k < 1; k++) {
                            var interestresults1 = interestresults[k];
                            var interestcolumns1 = interestresults1.getAllColumns();
                            interestamount += (parseFloat(interestresults1.getValue(interestcolumns1[0])));
                            stfcustomernew = interestresults1.getValue(interestcolumns1[2]);
                            nlapiLogExecution('debug', 'interestamount-loop', interestamount);
                            nlapiSubmitField("customer", stfcustomernew, "custentity_stf_interest_updated", "T");
                        }
                    }

                    nlapiLogExecution('debug', 'interestamount-final', interestamount);


                    var paymentresults = LoadSearchforPayment(stfcustomer, datestf, firstpaymentdate);
                    if (paymentresults && paymentresults.length > 0) {
                        nlapiLogExecution('debug', 'vendorpaymentresults.length',  paymentresults.length);
                        for (var j = 0; j < paymentresults.length; j++) {
                            var paymentresults1 = paymentresults[j];
                            var paymentcolumns1 = paymentresults1.getAllColumns();
                            paymentamount += parseFloat(paymentresults1.getValue(paymentcolumns1[1]));
                            nlapiLogExecution('debug', 'billpaymentamount-loop', paymentamount);

                        }
                    }
                    if (interestamount > 0) {
                        paymentamount = paymentamount + interestamount;
                    }
                    else {
                        interestamount = 0;
                    }
                    var stockvalue = GetStockValue(stfcustomer, datestf, firstpaymentdate);
                    var penaltyamount = parseFloat(GetPenaltyAmount(stfcustomer, datestf));
                    procurementcharges = parseFloat(procurementcharges);
                    salesmargin = parseFloat(salesmargin);
                    var prepaymentamount = parseFloat(getPrepaymentAmount(stfcustomer, datestf));
                    paymentamount += prepaymentamount

                    nlapiLogExecution('debug', 'prepaymentamount-final', prepaymentamount);
                    nlapiLogExecution('debug', 'billpaymentamount-final', paymentamount);

                    nlapiLogExecution('debug', 'penaltyamount', penaltyamount);
                    nlapiLogExecution('debug', 'stockvalue', stockvalue);



                    if (paymentamount > 0) {



                        //cumulative payment transactions start------------
                        var transaction_ids = []
                        var prepaymentsrecord = getPrepaymentRecords(stfcustomer, datestf);//getPrepaymentAmount()
                        nlapiLogExecution('debug', 'prepaymentsrecord', prepaymentsrecord);
                        transaction_ids = prepaymentsrecord

                        var paymentresults = getbillpaymentrecords(stfcustomer, datestf, firstpaymentdate);//LoadSearchforPayment()
                        nlapiLogExecution('debug', 'paymentresults-record', paymentresults);
                        transaction_ids += paymentresults
                        nlapiLogExecution('debug', 'transaction_ids', transaction_ids);

                        //cumulative payment transactions end--------------
                       





                        var netoutamount = parseFloat(paymentamount - depositamount - bankfundamount);
                        var principalwithoutbankfund = netoutamount - bankfundamount;
                        var interestwithoutbankfund = parseFloat((parseFloat(procurementchargesold) / 36500) * parseFloat(principalwithoutbankfund));
                        var procurementchargeswithbankfund = parseFloat(getbankfundingRate(stfcustomer, datestf));
                        var interestwithbankfund = procurementchargeswithbankfund;
                        var totalinterest = interestwithoutbankfund + interestwithbankfund;
                        var stfinterest = parseFloat(((procurementcharges) / 36500) * ((paymentamount * (1 + (salesmargin / 100))) - depositamount))
                        var receivedquantity = parseFloat(nlapiLookupField("customer", stfcustomer, "custentity_stf_recieved_quantity"));
                        var procurementchargesforextendedperiod = nlapiLookupField("customer", stfcustomer, "custentity_sam_procurement_charges_ep");
                        var stfcalculationrecord = nlapiCreateRecord("customrecord_stf_interest_calculat_rec");
                        stfcalculationrecord.setFieldValue("custrecord_stf_customer", stfcustomer);
                        stfcalculationrecord.setFieldValue("custrecord_stf_int_date", datestf);
                        stfcalculationrecord.setFieldValue("custrecord_procurement_wo_bf", procurementchargesold);
                        stfcalculationrecord.setFieldValue("custrecord_cumiliative_payment_amount", paymentamount);
                        stfcalculationrecord.setFieldValue("custrecord_stf_advance_amount", depositamount);
                        stfcalculationrecord.setFieldValue("custrecord_cumulative_receipt_inc_bf", depositamountwithbankfund);
                        stfcalculationrecord.setFieldValue("custrecord_stf_stock_value", stockvalue);
                        stfcalculationrecord.setFieldValue("custrecord_stf_sales_margin", salesmargin);
                        stfcalculationrecord.setFieldValue("custrecord_stf_net_out", convertToZero(netoutamount));
                        stfcalculationrecord.setFieldValue("custrecord_stf_principal_wo_bf", convertToZero(principalwithoutbankfund));
                        stfcalculationrecord.setFieldValue("custrecord_stf_principal_with_bf", bankfundamount);
                        stfcalculationrecord.setFieldValue("custrecord_stf_interest_wo_bf", convertToZero(interestwithoutbankfund));
                        stfcalculationrecord.setFieldValue("custrecord_stf_interest_with_bf", convertToZero(interestwithbankfund));
                        stfcalculationrecord.setFieldValue("custrecord_stf_total_interest", convertToZero(totalinterest));
                        stfcalculationrecord.setFieldValue("custrecord_bank_fund_amt", bankfundamount);
                        stfcalculationrecord.setFieldValue("custrecord_stf_received_quantity", receivedquantity);
                        stfcalculationrecord.setFieldValue("custrecord_procurement_charges_ext_prd", procurementchargesforextendedperiod);
                        stfcalculationrecord.setFieldValue("custrecord_sam_penal_interest", penalinterest);
                        if (penaltyamount) {
                            stfcalculationrecord.setFieldValue("custrecord_stf_penalty_charges", penaltyamount);
                        }
                        if (stfinterest > 0) {
                            stfcalculationrecord.setFieldValue("custrecord_stf_interest", stfinterest);
                        }
                        else {
                            stfcalculationrecord.setFieldValue("custrecord_stf_interest", 0);
                        }
                        stfcalculationrecord.setFieldValue("custrecord_stf_running_interest", interestamount);
                        stfcalculationrecord.setFieldValue("custrecord_cumulative_transaction_ref", transaction_ids);
                        var idRecord = nlapiSubmitRecord(stfcalculationrecord, true)



                        nlapiLogExecution('debug', 'netoutamount', netoutamount);
                        nlapiLogExecution('debug', 'principalwithoutbankfund', principalwithoutbankfund);
                        nlapiLogExecution('debug', 'bankfundamount', bankfundamount);
                        nlapiLogExecution('debug', 'interestwithoutbankfund', interestwithoutbankfund);
                        nlapiLogExecution('debug', 'interestwithbankfund', interestwithbankfund);
                        nlapiLogExecution('debug', 'totalinterest', totalinterest);
                        nlapiLogExecution('debug', 'receivedquantity', receivedquantity);
                        nlapiLogExecution('debug', 'procurementchargesforextendedperiod', procurementchargesforextendedperiod);
                        nlapiLogExecution('debug', 'prepaymentamount', prepaymentamount);
                        nlapiLogExecution('debug', 'stfinterest', stfinterest);
                        nlapiLogExecution('debug', 'interestamount', interestamount);

                        nlapiLogExecution('debug', 'idRecord', idRecord);
                    }
                }
            }
        }
    }
    catch (e) {
        nlapiLogExecution('debug', 'LoadSearchfordeposit', e.message);
    }
}

function LoadSearchforPayment(stfcustomer, datestf, firstpaymentdate) {
    try {
        var paymentresults = nlapiSearchRecord("vendorbill", 'customsearchstf_payment_calc_3',
            [
                ["custbody_stf_customer_new", "anyof", stfcustomer],
                "AND",
                ["payingtransaction.trandate", "onorbefore", datestf]
            ],
            [

            ]
        );

        var payload = JSON.stringify({
            fileName: 'stfInterestCalc_paymentSearch.json',
            data: paymentresults
        })

        var loggerResult = nlapiRequestRestlet(
            'customscript_json_logger_util_ssv2',
            'customdeploy_json_logger_util_ssv2',
            {},
            payload,
            { 'Content-Type': 'application/json' },
            'POST'
        );
       
        nlapiLogExecution('debug', 'LoadSearchforPayment - loggerResult', JSON.stringify(loggerResult));

        if (paymentresults && paymentresults.length > 0) {
            nlapiLogExecution('debug', 'paymentresults.length', paymentresults.length);

            for (var j = 0; j < paymentresults.length; j++) {
                for (var j in paymentresults) {
                    var paymentresults1 = paymentresults[j];
                    var paymentcolumns1 = paymentresults1.getAllColumns();

                }
            }
            return paymentresults;
        }
    }
    catch (e) {
        nlapiLogExecution('error', 'LoadSearchforPayment', e.message);
        return paymentresults;
    }
}

function GetPreviousmonthInterest(stfcustomer) {
    try {
        var interestresults = nlapiSearchRecord("customrecord_stf_interest_calculat_rec", 'customsearch_running_interest_calc',
            [
                ["custrecord_stf_customer", "is", stfcustomer]
            ],
            [

            ]
        );

        var payload = JSON.stringify({
            fileName: 'stfInterestCalc_previousMontheInterestSearch.json',
            data: interestresults
        })

        var loggerResult = nlapiRequestRestlet(
            'customscript_json_logger_util_ssv2',
            'customdeploy_json_logger_util_ssv2',
            {},
            payload,
            { 'Content-Type': 'application/json' },
            'POST'
        );
       
        nlapiLogExecution('debug', 'GetPreviousmonthInterest - loggerResult', JSON.stringify(loggerResult));

        if (interestresults && interestresults.length > 0) {
            for (var k = 0; k < interestresults.length; k++) {
                for (var k in interestresults) {
                    var interestresults1 = interestresults[k];
                    var interestcolumns1 = interestresults1.getAllColumns();
                }
            }
            return interestresults;
        }
    }
    catch (e) {
        nlapiLogExecution('error', 'GetPreviousmonthInterest', e.message);
        return interestresults;
    }
}

function GetInvoiceAmount(stfcustomer, datestf, firstpaymentdate) {
    try {
        var invoiceresults = nlapiSearchRecord("invoice", 'customsearch_stf_invoice_amt',
            [
                ["name", "anyof", stfcustomer],
                "AND",
                ["trandate", "onorbefore", datestf]
            ],
            [

            ]
        );

        var payload = JSON.stringify({
            fileName: 'stfInterestCalc_invoiceAmountSearch.json',
            data: invoiceresults
        })

        var loggerResult = nlapiRequestRestlet(
            'customscript_json_logger_util_ssv2',
            'customdeploy_json_logger_util_ssv2',
            {},
            payload,
            { 'Content-Type': 'application/json' },
            'POST'
        );
       
        nlapiLogExecution('debug', 'GetInvoiceAmount - loggerResult', JSON.stringify(loggerResult));

        if (invoiceresults && invoiceresults.length > 0) {
            for (var l = 0; l < invoiceresults.length; l++) {
                for (var l in invoiceresults) {
                    var invoiceresults1 = invoiceresults[l];
                    var invoicecolumns1 = invoiceresults1.getAllColumns();

                }
            }
            return invoiceresults;
        }
    }
    catch (e) {
        nlapiLogExecution('error', 'GetInvoiceAmount', e.message);
        return invoiceresults;
    }
}

function GetStockValue(stfcustomer) {
    var stockvalue = 0;
    try {
        var stockresults = nlapiSearchRecord("salesorder", 'customsearch_stf_stock_value',
            [
                ["name", "anyof", stfcustomer]
            ],
            [

            ]
        );

        var payload = JSON.stringify({
            fileName: 'stfInterestCalc_stockValueSearch.json',
            data: stockresults
        })

        var loggerResult = nlapiRequestRestlet(
            'customscript_json_logger_util_ssv2',
            'customdeploy_json_logger_util_ssv2',
            {},
            payload,
            { 'Content-Type': 'application/json' },
            'POST'
        );
       
        nlapiLogExecution('debug', 'GetStockValue - loggerResult', JSON.stringify(loggerResult));

        if (stockresults && stockresults.length > 0) {
            for (var m = 0; m < stockresults.length; m++) {
                var stockresults1 = stockresults[m];
                var stockcolumns1 = stockresults1.getAllColumns();
                var itemaveragecost = (parseFloat(stockresults1.getValue(stockcolumns1[2])));
                var quantitycommitted = (parseFloat(stockresults1.getValue(stockcolumns1[3])));
                var transactionunits = stockresults1.getValue(stockcolumns1[4]);
                var stockunits = stockresults1.getText(stockcolumns1[5]);
                if (transactionunits != stockunits) {
                    var transactionunitsrate = GetUnitrate(transactionunits)
                    var stockunitsrate = GetUnitrate(stockunits)
                    itemaveragecost = parseInt(itemaveragecost) * (parseInt(transactionunitsrate) / parseInt(stockunitsrate))
                }
                stockvalue += itemaveragecost * quantitycommitted;
            }
        }
        return stockvalue;
    }
    catch (e) {
        nlapiLogExecution('error', 'GetStockValue', e.message);
        return stockvalue;
    }
}


function GetUnitrate(units) {
    try {
        var filters = [
            new nlobjSearchFilter('unitname', null, 'is', units),
        ];
        var columns = [
            new nlobjSearchColumn('conversionrate')
        ];
        results = nlapiSearchRecord('unitstype', null, filters, columns);
        
        var payload = JSON.stringify({
            fileName: 'stfInterestCalc_unitRateSearch.json',
            data: results
        })

        var loggerResult = nlapiRequestRestlet(
            'customscript_json_logger_util_ssv2',
            'customdeploy_json_logger_util_ssv2',
            {},
            payload,
            { 'Content-Type': 'application/json' },
            'POST'
        );
       
        nlapiLogExecution('debug', 'GetUnitrate - loggerResult', JSON.stringify(loggerResult));

        if (results && results.length > 0) {
            for (var z = 0; z < 1; z++) {
                var conversionrate = results[z].getValue('conversionrate');
                return conversionrate;
            }
        }
        return conversionrate;
    }
    catch (e) {
        nlapiLogExecution('error', 'GetUnitrate', e.message);
        return conversionrate;
    }
}


function GetPenaltyAmount(stfcustomer) {
    var penaltyamount = 0
    var penaltyresults = nlapiSearchRecord("customrecord_non_btst_pen_inv", 'customsearch_non_btst_penalty_amt',
        [
            ["custrecord_non_btst_customer", "is", stfcustomer]
        ],
        [

        ]
    );

    var payload = JSON.stringify({
        fileName: 'stfInterestCalc_penaltyAmountSearch.json',
        data: penaltyresults
    })

    var loggerResult = nlapiRequestRestlet(
        'customscript_json_logger_util_ssv2',
        'customdeploy_json_logger_util_ssv2',
        {},
        payload,
        { 'Content-Type': 'application/json' },
        'POST'
    );
       
    nlapiLogExecution('debug', 'GetPenaltyAmount - loggerResult', JSON.stringify(loggerResult));

    if (penaltyresults && penaltyresults.length > 0) {
        for (var c = 0; c < 1; c++) {
            for (var c in penaltyresults) {
                var penaltyresults1 = penaltyresults[c];
                var penaltycolumns1 = penaltyresults1.getAllColumns();
                penaltyamount += parseFloat(penaltyresults1.getValue(penaltycolumns1[1]));
            }
        }
        return penaltyamount;
    }
}

function getDepositAmount(stfcustomer, datestf, firstpaymentdate) {
    var depositamount = 0
    var depositresults = nlapiSearchRecord("customerdeposit", 'customsearch6139',
        [
            ["name", "anyof", stfcustomer],
            "AND",
            ["trandate", "onorbefore", datestf]
        ],
        [

        ]
    );

    var payload = JSON.stringify({
        fileName: 'stfInterestCalc_depositAmountSearch.json',
        data: depositresults
    })

    var loggerResult = nlapiRequestRestlet(
        'customscript_json_logger_util_ssv2',
        'customdeploy_json_logger_util_ssv2',
        {},
        payload,
        { 'Content-Type': 'application/json' },
        'POST'
    );
       
    nlapiLogExecution('debug', 'getDepositAmount - loggerResult', JSON.stringify(loggerResult));

    if (depositresults && depositresults.length > 0) {
        for (var r = 0; r < 1; r++) {
            for (var r in depositresults) {
                var depositresults1 = depositresults[r];
                var depositcolumns1 = depositresults1.getAllColumns();
                depositamount += parseFloat(depositresults1.getValue(depositcolumns1[1]));
            }
        }
        return depositamount;
    }
}

function getPaymentAmount(stfcustomer, firstpaymentdate, datestf) {
    var custpymntamount = 0
    var custpymntresults = nlapiSearchRecord("customerpayment", 'customsearch_get_pay_amount_stf',
        [
            ["name", "anyof", stfcustomer],
            "AND",
            ["applyingtransaction.datecreated", "within", firstpaymentdate, datestf]
        ],
        [

        ]
    );

    var payload = JSON.stringify({
        fileName: 'stfInterestCalc_paymentAmountSearch.json',
        data: custpymntresults
    })

    var loggerResult = nlapiRequestRestlet(
        'customscript_json_logger_util_ssv2',
        'customdeploy_json_logger_util_ssv2',
        {},
        payload,
        { 'Content-Type': 'application/json' },
        'POST'
    );
       
    nlapiLogExecution('debug', 'getPaymentAmount - loggerResult', JSON.stringify(loggerResult));

    if (custpymntresults && custpymntresults.length > 0) {
        for (var q = 0; q < 1; q++) {
            for (var q in custpymntresults) {
                var custpymntresults1 = custpymntresults[q];
                var custpymntcolumns1 = custpymntresults1.getAllColumns();
                custpymntamount += parseFloat(custpymntresults1.getValue(custpymntcolumns1[1]));
            }
        }
        return custpymntamount;
    }
}

function getbankfundingamount(firstpaymentdate, stfcustomer, datestf) {
    try {
        var bankfundingamount = 0;
        var filters = [
            ["custrecord_bank_contract", "anyof", stfcustomer],
            "AND",
            ["custrecord_bank_date", "onorbefore", datestf]
        ];
        var columns = [
            new nlobjSearchColumn('custrecord_bank_funding_amount')
        ];
        results = nlapiSearchRecord('customrecord_sam_bank_funding_details', null, filters, columns);
        
        var payload = JSON.stringify({
            fileName: 'stfInterestCalc_bankFundingAmountSearch.json',
            data: results
        })

        var loggerResult = nlapiRequestRestlet(
            'customscript_json_logger_util_ssv2',
            'customdeploy_json_logger_util_ssv2',
            {},
            payload,
            { 'Content-Type': 'application/json' },
            'POST'
        );
       
        nlapiLogExecution('debug', 'getbankfundingamount - loggerResult', JSON.stringify(loggerResult));

        if (results && results.length > 0) {
            for (var p = 0; p < results.length; p++) {
                bankfundingamount += parseFloat(results[p].getValue('custrecord_bank_funding_amount'));
            }
        }
        return bankfundingamount;
    }
    catch (e) {
        nlapiLogExecution('error', 'getbankfundingamount', e.message);
        return bankfundingamount;
    }
}

function getbankfundingRate(stfcustomer, datestf) {
    try {
        var bankfundingrate = 0;
        var filters = [
            ["custrecord_bank_contract", "anyof", stfcustomer],
            "AND",
            ["custrecord_bank_date", "onorbefore", datestf]
        ];
        var columns = [
            new nlobjSearchColumn('custrecord_bank_interest_rate'),
            new nlobjSearchColumn('custrecord_bank_funding_amount')
        ];
        results = nlapiSearchRecord('customrecord_sam_bank_funding_details', null, filters, columns);
        
        var payload = JSON.stringify({
            fileName: 'stfInterestCalc_bankFundingRateSearch.json',
            data: results
        })

        var loggerResult = nlapiRequestRestlet(
            'customscript_json_logger_util_ssv2',
            'customdeploy_json_logger_util_ssv2',
            {},
            payload,
            { 'Content-Type': 'application/json' },
            'POST'
        );
       
        nlapiLogExecution('debug', 'getbankfundingRate - loggerResult', JSON.stringify(loggerResult));

        if (results && results.length > 0) {
            for (var p = 0; p < results.length; p++) {
                var bankfundrate = parseFloat(results[p].getValue('custrecord_bank_interest_rate'));
                var bankfundingamount1 = parseFloat(results[p].getValue('custrecord_bank_funding_amount'));
                bankfundingrate += parseFloat(bankfundrate / 36500) * bankfundingamount1;

            }
        }
        return bankfundingrate;
    }
    catch (e) {
        nlapiLogExecution('error', 'getbankfundingRate', e.message);
        return bankfundingrate;
    }
}


function convertToZero(number) {
    if (number < 0) {
        return 0;
    } else {
        return number;
    }
}

function getPrepaymentAmount(stfcustomer, datestf) {
    try {
        
        var prepaymentamount = 0;
        var filters = [
            // ["type", "anyof", "VPrep"],
            // "AND",
            ["mainline", "is", "T"],
            "AND",
            ["taxline", "is", "F"],
            "AND",
            ["custbody_stf_so_contract", "anyof", stfcustomer],
            "AND",
            ["trandate", "onorbefore", datestf], 
            "AND", 
            ["status","noneof","VPrep:A","VPrep:R","VPrep:V"]
        ]
        var coloumns =
            [
                new nlobjSearchColumn("amount", null, "SUM"),
                new nlobjSearchColumn("custbody_stf_so_contract", null, "GROUP")
            ]
        var results = nlapiSearchRecord('vendorprepayment', null, filters, coloumns);
        nlapiLogExecution('debug', 'vendorprepayment-results.length', results.length);
        
        var payload = JSON.stringify({
            fileName: 'stfInterestCalc_prepaymentAmountSearch.json',
            data: results
        })

        var loggerResult = nlapiRequestRestlet(
            'customscript_json_logger_util_ssv2',
            'customdeploy_json_logger_util_ssv2',
            {},
            payload,
            { 'Content-Type': 'application/json' },
            'POST'
        );
       
        nlapiLogExecution('debug', 'getPrepaymentAmount - loggerResult', JSON.stringify(loggerResult));

        if (results && results.length > 0) {
            for (var p = 0; p < results.length; p++) {
                prepaymentamount += parseFloat(results[p].getValue("amount", null, "SUM"));
                nlapiLogExecution('debug', 'prepaymentamount-loop', prepaymentamount);
            }
        }
        prepaymentamount = Math.abs(prepaymentamount)
        return prepaymentamount;
    }
    catch (e) {
        nlapiLogExecution('error', 'getPrepaymentAmount', e.message);
        return prepaymentamount;
    }
}
function getPrepaymentRecords(stfcustomer, datestf) {
    try {

        var prepayments_data = []

        var prepaymentamount = 0;
        var filters = [
            // ["type", "anyof", "VPrep"],
            // "AND",
            ["mainline", "is", "T"],
            "AND",
            ["taxline", "is", "F"],
            "AND",
            ["custbody_stf_so_contract", "anyof", stfcustomer],
            "AND",
            ["trandate", "onorbefore", datestf], 
            "AND", 
            ["status","noneof","VPrep:A","VPrep:R","VPrep:V"]
        ]
        var coloumns =
            [
                new nlobjSearchColumn("amount", null, "SUM"),
                new nlobjSearchColumn("custbody_stf_so_contract", null, "GROUP"),
                new nlobjSearchColumn("internalid", null, "GROUP"),
                new nlobjSearchColumn("tranid", null, "GROUP")
            ]
        var results = nlapiSearchRecord('vendorprepayment', null, filters, coloumns);
        nlapiLogExecution('debug', 'vprep-results.length', results.length);
        
        var payload = JSON.stringify({
            fileName: 'stfInterestCalc_prepaymentRecordsSearch.json',
            data: results
        })

        var loggerResult = nlapiRequestRestlet(
            'customscript_json_logger_util_ssv2',
            'customdeploy_json_logger_util_ssv2',
            {},
            payload,
            { 'Content-Type': 'application/json' },
            'POST'
        );
       
        nlapiLogExecution('debug', 'getPrepaymentRecords - loggerResult', JSON.stringify(loggerResult));

        if (results && results.length > 0) {
            for (var p = 0; p < results.length; p++) {
                var prepaymentrecords = results[p].getValue("tranid", null, "GROUP");
                var prepayment_amount = results[p].getValue("amount", null, "SUM");
                prepayments_data.push(prepaymentrecords + ":" + prepayment_amount + ",")
            }
        }
        nlapiLogExecution('debug', 'prepayments_data', prepayments_data);
        return prepayments_data;
    }
    catch (e) {
        nlapiLogExecution('error', 'getPrepaymentrecords', e.message);
        return prepayments_data;
    }
}

function getbillpaymentrecords(stfcustomer, datestf, firstpaymentdate) {
    try {
        var billpayments_data = []

        var paymentresults1_ = nlapiSearchRecord("vendorbill", 'customsearchstf_payment_calc_3',
            [
                ["custbody_stf_customer_new", "anyof", stfcustomer],
                "AND",
                ["payingtransaction.trandate", "onorbefore", datestf]
            ],
            [
                new nlobjSearchColumn("applyinglinkamount"),
                new nlobjSearchColumn("tranid", "applyingTransaction", null),
                new nlobjSearchColumn("internalid", "applyingTransaction", null)
            ]
        );

        var payload = JSON.stringify({
            fileName: 'stfInterestCalc_billPaymentRecordSearch.json',
            data: paymentresults1_
        })

        var loggerResult = nlapiRequestRestlet(
            'customscript_json_logger_util_ssv2',
            'customdeploy_json_logger_util_ssv2',
            {},
            payload,
            { 'Content-Type': 'application/json' },
            'POST'
        );
       
        nlapiLogExecution('debug', 'getbillpaymentrecords - loggerResult', JSON.stringify(loggerResult));

        if (paymentresults1_ && paymentresults1_.length > 0) {
            nlapiLogExecution('debug', 'paymentresults1_records.length', paymentresults1_.length);

            for (var j = 0; j < paymentresults1_.length; j++) {
                var paymentresults1_res = paymentresults1_[j];
                var paymentcolumns1_ = paymentresults1_res.getAllColumns();
                var billpaymentnumber = paymentresults1_res.getValue(paymentcolumns1_[1]);
                var billpaymentamount = paymentresults1_res.getValue(paymentcolumns1_[0]);
                nlapiLogExecution('debug', 'billpaymentnumber', billpaymentnumber);
                billpayments_data.push(billpaymentnumber + ":" + billpaymentamount + ",")
            }

            return billpayments_data;
        }
    }
    catch (e) {
        nlapiLogExecution('error', 'LoadSearchforPayment', e.message);
        return billpayments_data;
    }
}
