// READ!!! http://stackoverflow.com/questions/18153410/how-to-use-q-all-with-complex-array-of-promises
var fb = require("./fb");
var emojis = ["(y)","<3",":)",":(",":p",":/",":D"];
var Q = require("q");
var Adapter = require("./Adapter");
var db = new Adapter();
var nlp = require("./nlp");
var _ = require("underscore");
var http = require('http');
var request = require('request');

//------------------------------------------------------------------------------
module.exports = function(req,res,next){
    // Tell FB that we have received the request by ending it.
    // Without this, the request will timeout and FB will resend it
    // causing you to accidentally spam the user.
	
	var action=req.body.action || "facebook";
	console.log("==params",action);
	res.end();
if(action=='facebook')
{
	console.log("===Received a message from FB");
	
    // get all the entries
    var entries = req.body.entry;
    var promises = [];
    entries.forEach(function(entry){
       var messages = entry.messaging;
       // get all the messages
       messages.forEach(function(message){
           //console.log("===message",message);
           var senderId = message.sender.id;

	
           // check if it is a text message
           var isTextMessage = Object.keys(message).indexOf("message") != -1;
           var isPostback = Object.keys(message).indexOf("postback") != -1;
           if( isTextMessage ){
			   var msg_id=message.message.mid;
               var text = message.message.text;
               console.log("===text message",text);
	
               // in case of text messages
               // we send the text to API.ai for NLP
               // however, we check for some special messages that don't need NLP
               // like thumbs and hearts, etc.
               var index = emojis.indexOf( text );
               if( index != -1 ){
                   console.log("===user sent emoji");
                   fb.reply( fb.textMessage(emojis[index]), senderId );
               }else{
                   // NLP!
                   console.log("===user sent text");
                   promises.push( nlp(text,senderId,msg_id) );
				  
               }
           }else if(isPostback){
               console.log("===user sent postback");
               handlePostback(message.postback.payload,senderId);
           }else{
               // else, just send a thumb
               fb.reply( fb.textMessage("(y)"), senderId);
           }// END IF FOR isTextMessage
       });
    });
    Q.all(promises).then(function(results){
        results.forEach(function(result){
			//checkControlOfChat(result);
			
           afterNlp(result);
        });
    },function(error){
        console.log("[webhook_post.js]",error);
    });
    return next();

}
else{
	console.log("===Received a message from letsclap");
	var senderId=req.body.user_id;
	console.log("===letsclap user_id=",senderId);
	updateUserStatus(senderId,1);
	return fb.reply(fb.textMessage("So you are back with Babun Bot. Say HELLO to get started."),senderId);
}	
}
//------------------------------------------------------------------------------



function afterNlp(data){


   var action = data.result.action;

    console.log("===action",action);
    if( data.result.source == "agent" ){
        switch( action ){
			
			case "agent.hello.babun":
                hello(data);
                break;
            case "agent.about":
                about(data);
                break;
            
            default:
                //dontKnow(data);
        }
    }else if( data.result.source == "domains" ){
        console.log("===domains");
        // API.ai converts all our complex queries into
        // a simplified, canonical form.
        // We check this to decide our responses
        if( action == "input.unknown" || action == "wisdom.unknown" ){
            //dontKnow(data);
        }else{
            var simplified = data.result.parameters.simplified;
            console.log("===simplified",simplified);
            switch( simplified ){
                case "how are you":
                    howAreYou(data);
                    break;
                case "hello":
                    hello(data);
                    break;
                
                default:
                    console.log("===domains unknown/rejected action");
                    //dontKnow(data);
            }
        }
    }else{
        //dontKnow(data);
    }
}
//------------------------------------------------------------------------------







function handlePostback(payload,senderId){
    console.log("===postback",payload);
    console.log("===senderId",senderId);

	if(payload.toString().trim()==="hello")
	{
		var promises = [];
	     var msg_id="1234";
		 var text="hello";
		 promises.push( nlp(text,senderId,msg_id) );
		 Q.all(promises).then(function(results){
			results.forEach(function(result){
            afterNlp(result);
        });
		},function(error){
			console.log("[webhook_post.js]",error);
		});
	}
	
	
	
	
   
}
//------------------------------------------------------------------------------
function about(data){
    var senderId = data.sessionId;
    
}



//------------------------------------------------------------------------------
function hello(data){
    var senderId = data.sessionId;
    
}


//------------------------------------------------------------------------------
function randomIndex(array){
    return Math.floor(Math.random()*array.length);
}
//------------------------------------------------------------------------------