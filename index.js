const rp = require("request-promise");

// Route the incoming request based on intent.
// The JSON body of the request is provided in the event slot.
exports.handler = (event, context, callback) => {
    try {
        console.log(`Bot Name = ${event.bot.name}`);
        if (event.bot.name !== "LiquorLottery") {
            callback("Invalid Bot Name");
        }
        dispatch(event, (response) => callback(null, response));
    } catch (err) {
        callback(err);
    }
};

/**
 * Called when the user specifies an intent for this skill.
 */
function dispatch(intentRequest, callback) {
    console.log(`dispatch userId=${intentRequest.userId}, intentName=${intentRequest.currentIntent.name}`);

    const intentName = intentRequest.currentIntent.name;

    // Dispatch to your skill's intent handlers
    if (intentName === "OpenLottery") {
        retrieveLotteries().then(lotteries => {
            const filtered = lotteries.filter(lottery => lottery.open);

            // check to ensure there was stocking data
            if (filtered.length === 0) {
                callback({
                    sessionAttributes: intentRequest.sessionAttributes,
                    dialogAction: {
                        type: "Close",
                        fulfillmentState: "Fulfilled",
                        message: {
                            contentType: "PlainText",
                            content: "No open lotteries were found."
                        }
                    }
                });
                return;
            }

            callback({
                sessionAttributes: intentRequest.sessionAttributes,
                dialogAction: {
                    type: "Close",
                    fulfillmentState: "Fulfilled",
                    message: {
                        contentType: "PlainText",
                        content: `There ${filtered.length > 1 ? "are" : "is"} ${filtered.length} open ${filtered.length > 1 ? "lotteries" : "lottery"}. ${aggregateLotteries(filtered)}.`
                    }
                }
            });
        }).catch(err => {
            callback(err);
        });
    } else if (intentName === "UpcomingLottery") {
        retrieveLotteries().then(lotteries => {
            const filtered = lotteries.filter(lottery => !(lottery.open));

            // check to ensure there was stocking data
            if (filtered.length === 0) {
                callback({
                    sessionAttributes: intentRequest.sessionAttributes,
                    dialogAction: {
                        type: "Close",
                        fulfillmentState: "Fulfilled",
                        message: {
                            contentType: "PlainText",
                            content: "No upcoming lotteries were found."
                        }
                    }
                });
                return;
            }

            callback({
                sessionAttributes: intentRequest.sessionAttributes,
                dialogAction: {
                    type: "Close",
                    fulfillmentState: "Fulfilled",
                    message: {
                        contentType: "PlainText",
                        content: `There ${filtered.length > 1 ? "are" : "is"} ${filtered.length} upcoming ${filtered.length > 1 ? "lotteries" : "lottery"}. ${aggregateLotteries(filtered)}.`
                    }
                }
            });
        }).catch(err => {
            callback(err);
        });
    } else if (intentName === "EnterLottery") {
        callback({
            sessionAttributes: intentRequest.sessionAttributes,
            dialogAction: {
                type: "Close",
                fulfillmentState: "Fulfilled",
                message: {
                    contentType: "PlainText",
                    content: "We don't support this feature...yet."
                }
            }
        });
    } else {
        throw new Error(`Intent with name ${intentName} not supported`);
    }
}

function retrieveLotteries() {
    return rp({
        method: "GET",
        uri: "https://abhi2xr3kb.execute-api.us-east-1.amazonaws.com/prod/lottery",
        json: true
    }).then(distributions => {
        console.log(`${distributions.length} entries found: ${JSON.stringify(distributions)}`);
        return distributions;
    });
}

function aggregateLotteries(lotteries) {
    return makeGoodListGrammar(lotteries.map(lottery => `${lottery.name}, which is ${lottery.quantity} for ${lottery.price}`));
}

function makeGoodListGrammar(descriptions) {
    if (descriptions.length === 1) {
        return descriptions[0];
    } else {
        return descriptions.map((description, index) => `${index === 0 ? "" : ", "}${index === descriptions.length - 1 ? "and " : ""}${description}`).join("");
    }
}