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
		//res.end();
		console.log("===Received a message from FB");

		// get all the entries
		var entries = req.body.entry;
		var promises = [];
		entries.forEach(function(entry){
		   var messages = entry.messaging;
		   // get all the messages
		   messages.forEach(function(message){
			   console.log("===message",message);
			   var senderId = message.sender.id;
				console.log("senderiD from messengr "+senderId);

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
					   //fb.reply( fb.textMessage(emojis[index]), senderId );
				   }else{
					   // NLP!
					   console.log("===user sent text");
					   checkControlOfChat(senderId,text);
					   
					    //fb.reply( fb.textMessage("hello"), senderId );
					   //promises.push( nlp(text,senderId,msg_id) );

				   }
			   }else if(isPostback){
				   console.log("===user sent postback");
				   handlePostback(message.postback.payload,senderId);
			   }else{
				   // else, just send a thumb
				   //fb.reply( fb.textMessage("(y)"), senderId);
			   }// END IF FOR isTextMessage
		   });
		});
		/* Q.all(promises).then(function(results){
			results.forEach(function(result){
				//checkControlOfChat(result);

			   afterNlp(result);
			});
		},function(error){
			console.log("[webhook_post.js]",error);
		}); */
		return next();

	}
	else{
		console.log("===Received a message from letsclap");
		var text = req.body.message;
		
		var message = {
			"text" : text
		};
		console.log("==message",message);
		res.send(message);
		return next();
	}	
}
//------------------------------------------------------------------------------



function Nlp(senderId,text){

	var in_msg=text.toString().toUpperCase();;
	if ((in_msg=="HELLO") ||(in_msg=="HI")||(in_msg=="HEY")||(in_msg=="HELO"))
	{
	console.log("in_msg "+in_msg);
	
		sendDefaultMessage(senderId);
	}
	else if(in_msg=="STOP CHAT")
	{
		updateUserStatus(senderId,1);
		var text="You are back with the Bot now. Continue."
		fb.reply( fb.textMessage(text), senderId);
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
	
	else if(payload.toString()=="livechat"){
		sendChatStartMessage(senderId);
		updateUserStatus(senderId,0);
	}
	else if(payload.toString()=="stopchat"){
		updateUserStatus(senderId,1);
		var text="You are back with the Bot now. Continue."
		fb.reply( fb.textMessage(text), senderId);
	}
	else if(payload.toString()=="qna"){
		sendQuestionsList(senderId);
	}
	else if(payload.toString()=="answer1"){	
		sendAnswerOnlyText(senderId,1);
	}
}

function sendDefaultMessage(senderId){
	var btn1=fb.createButton("Q&A","qna");
	var btn2=fb.createButton("Live Chat","livechat");
	var buttons=[btn1,btn2];
	var title="Welcome to Larger than Life";
	var subtitle="subtitle goes here";
	var image="http://www.netconnections.name/123/larger/images/donate.jpg";
	var element1=fb.createElement(title,subtitle,image,buttons);
	var elements=[element1];
	var message =fb.carouselMessage(elements);
	fb.reply(message,senderId);
}

function sendChatStartMessage(senderId){
	var btn1=fb.createButton("Stop Chat","stopchat");
	
	var buttons=[btn1];
	var title="You are connected with a real human";
	var subtitle="To Stop this chat, please press stop chat button or send STOP CHAT message";
	var image="";
	var element1=fb.createElement(title,subtitle,image,buttons);
	var elements=[element1];
	var message =fb.carouselMessage(elements);
	fb.reply(message,senderId);
}

function sendQuestionsList(senderId){

	return db.getMessagesOfType("questions").then(function(messages){
		console.log("messages from firebase "+messages);
		var elements=[];
		for(var i = 0; i < messages.length; i++){
			var title=messages[i].title;
			var subtitle=messages[i].subtitle;
			btn_payload="answer"+i;
			var btn1=fb.createButton("Answer",btn_payload);
			var buttons=[btn1];
			var image="";
			var element=fb.createElement(title,subtitle,image,buttons);
			//var element=fb.createElementOnlyText(title,subtitle);
			elements.push(element);
			
		}
        var message =fb.carouselMessage(elements); 
        return fb.reply(message,senderId);
    },function(error){
        console.log("[webhook_post.js]",error);
    });
}

function sendAnswerOnlyText(senderId,0){
	return db.getMessagesOfType("answers").then(function(messages){
		var text=messages[0].text;
		
        return fb.reply(fb.textMessage(text), senderId);
    },function(error){
        console.log("[webhook_post.js]",error);
    });

}
function checkControlOfChat(senderId,text){
	console.log("senderId sent to db "+senderId);
	return db.getBotUser(senderId).then(function(rows){
		console.log("==rows length"+rows.length);
		if (rows.length>0)
		{
		  if(rows[0].is_botactive==0){console.log("===control lies with letsclap");}

		  else{
			console.log("===control lies with bot");
			Nlp(senderId,text);
		  }
		}
		else
		{
			console.log("===inserting a new row to the bot_users");
			var new_user=insertNewBotUser(senderId);
			Nlp(senderId,text);
	
		}

	},function(error){
		console.log("[webhook_post.js]",error);
	});
}

function insertNewBotUser(senderId){
	return db.insertBotUser(senderId).then(function(result){
		return result;

	},function(error){
		console.log("[webhook_post.js]",error);
	});

}

function updateUserStatus(senderId,is_botactive){
	return db.updateUserStatus(senderId,is_botactive).then(function(result){
		return result;

	},function(error){
		console.log("[webhook_post.js]",error);
	});

}

function oneOf(array){
    if(array instanceof  Array){
        var index = randomIndex(array);
        return array[ index ];
    }
}
