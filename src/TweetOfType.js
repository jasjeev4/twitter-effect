module.exports = {
    getData : getData
};
console.log('tweet of type');
var epoch = Date.parse('January 1, 2014');
var async = require('async');
var fs = require('fs');
var Twit = require('twit');
var file = fs.readFileSync(__dirname + '/secret.json').toString();
var secret = JSON.parse(file);
import config from './cfg';
console.log(config.consumer_key);
var T = new Twit({
    consumer_key:        config.consumer_key
  , consumer_secret:     config.consumer_secret
  , app_only_auth:        true
});


var swearjar = require('swearjar');

var watson = require('watson-developer-cloud');
var language_translator = watson.language_translator({
  username: 'fc15a4b5-c336-4de9-bd72-bc9d3928371c',
  password: 'IDJdrL2Zj5TQ',
  version: 'v2'
});

function getData(slug, callback) {
	T.get('users/suggestions/:slug', { slug: slug }, function (err, data, response) {
	  	var allUsers = data.users;
		topUser(allUsers, 0, callback);
	});
}

var topUser = function(allUsers, i, callback) {
	var topUser = {};
	var curUser = allUsers[i];
	topUser.name = curUser.name;
	topUser.id = curUser.id;
	getTopTweet(curUser.id, function(retVal) {
  		if(retVal != null) {
  			topUser.topTweet = retVal;
  			callback(topUser);
  		}
  		else {
  			topUser(allUsers, i+1, callback);
  		}
  	});
}

var getTopTweet = function(id, callback) {

		T.get('statuses/user_timeline', {user_id: id, include_rts: false},  function (err, data, response) {
			var topTweets = [];
			var sum_rt = 0;
			var sum_fav = 0;
			var c = data.length;

			for(var i=0; i<c;  i++) {
				topTweets[i] = {};

				var curTweet = data[i];
				topTweets[i].rts = curTweet.retweet_count;
				sum_rt += curTweet.retweet_count;
			    topTweets[i].favs = curTweet.favorite_count;
			    sum_fav += curTweet.favorite_count;
			    topTweets[i].tweet_by_name = curTweet.user.name;
			    var tweet_text = curTweet.text;
			    topTweets[i].date = new Date(curTweet.created_at);
			    var urlsArr = curTweet.entities.urls;
			    for(var j=0; j<urlsArr.length; j++) {
			    	var url = urlsArr[j].url;
			    	tweet_text = tweet_text.replace(url,'');
			    }
			     tweet_text = tweet_text.replace(/(?:https?|ftp):\/\/[\n\S]+/g, '');
			    topTweets[i].tweet_text = tweet_text;
			}


			for(var i=0; i<c;  i++) {
				var rts = topTweets[i].rts;
				var favs = topTweets[i].favs;
				var date = topTweets[i].date;
				topTweets[i].hotscore = getHotscore(c, rts, favs, sum_rt, sum_fav, date);

				var key = topTweets[i].hotscore;
				var j = i-1;
				while((j>=0) && (topTweets[j].hotscore>key)) {
					topTweets[j+1] = topTweets[j];
					j = j-1;
				}
				topTweets[j+1].hotscore = key;
	 		}

	 		returnTop(topTweets, 0, callback);

		});
}

function returnTop(topTweets, i, callback) {
	if(i<topTweets.length) {
		var curTweet = topTweets[i];
		var tweet_text = curTweet.tweet_text;
		language_translator.identify({ text: tweet_text},
		  function(err, identifiedLanguages) {
		    if (err)
		      console.log(err);
		    else {
		      identifiedLanguages.languages.forEach(function(lang) {
		        if (lang.language === 'en')
		        	//console.log(lang.confidence);
		        	if ((lang.confidence > '.85') && (!swearjar.profane(tweet_text))) //if its over .85 certainty
		        	{
		        		//console.log(curTweet);
		        		//test for profanity

		        		callback(curTweet);
		        	}
		        	else {
		        		returnTop(topTweets, i+1, callback);
		        	}
		      });
		    }
		});
	}
	else {
		callback(null);
	}
}

function score(cur, avg)
{
    var diff = cur-avg;
    if(diff<0)
        return 0;
    else
        return diff;
}

function getHotscore(c, rts, favs, sum_rt, sum_fav, date)
{
    var ret = {};
    var s = 0;
    if(c>0)
    {
        var avg_rt = (sum_rt/c);
        var avg_favs = (sum_fav/c);
        var avg = avg_rt+avg_favs;
        var cur = rts+favs;
        s = score(cur, avg);
    }
    ret.s = s;
    var order = Math.log(Math.max(Math.abs(s), 1), 10);
    var sign = setSign(s);
    var t = (date - epoch)/1000;
    var hots = (order*sign) + (t/45000);
    ret.hots = hots;
    return ret;
}

function setSign(s)
{
    var sign;
    if(s>0)
        sign = 1;
    else if(s<0)
        sign = -1;
    else
        sign = 0;
    return sign;
}
