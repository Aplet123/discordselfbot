var fs = require("fs");
var auth = require("./auth.json");
try {
    if(fs.readFileSync(auth["Collection.js"], "utf8").length > 50) {
        fs.writeFileSync(auth["Collection.js"], "module.exports = require(\"saltjs\").Storage;", "utf8");
    }
} catch (err) {
    console.error("error replacing Collection.js");
}
var _ = require("lodash");
var chalk = require("chalk");
var Discord = require("discord.js");
var request = require("request");
var cheerio = require("cheerio");
var selfJSON = require("./selfbot.json");
const Cmds = require("sugarcmds");
var moment = require("moment");
fs.writeFileSync("selfbot.json", JSON.stringify(selfJSON), "utf8");
var bot = new Discord.Client({
    bot: false
});
var loading = {};
var loadingSymbols = ["|", "/", "-", "\\", "|", "/", "-", "\\"].map(v => "Loading... " + v);
var loadingIndex = 0;
var voteSpamChannel = {id: undefined};
var yt = new (require("youtube-node"))();
yt.setKey(auth.ytkey);
/*USEFUL STUFF*/
Object.prototype[Symbol.toPrimitive] = function (hint) {
    if (hint === "string") {
        return this.toString();
    } else if (hint === "number") {
        return NaN;
    } else if (hint === "default") {
        return this.toString();
    } else {
        return;
    }
}
function commaify (str, count = 3) {
    if(str.length <= count) {
        return str;
    }
    str = str.split``;
    var begin = str.slice(0, str.length % count).join``;
    str.splice(0, str.length % count);
    return ((begin.length > 0) ? begin + "," : "") + str.join``.match(new RegExp("\\d".repeat(count), "g")).join`,`;
}
function hashInGuild (thing) {
    return new Buffer(thing.id + ":" + thing.guild.id).toString("base64");
}
function hashInChannel (thing) {
    return new Buffer(thing.id + ":" + thing.channel.id).toString("base64");
}
function cmd (query, channel) {
    var embed = new Discord.RichEmbed();
    var cp = require("child_process");
    embed.setTitle("-=≡COMMAND LINE≡=-");
    embed.addField("Query:", `\`\`\`js
${query}
\`\`\``);
    try {
    cp.exec(query, (error, stdout, stderr) => {
        if (error) {
            embed.setColor(0xff0000);
            embed.addField("Error:", `\`\`\`js
${error.toString()}
\`\`\``);
console.log(`Command ${query} finished with error:
${error}`);
            channel.sendEmbed(embed);
        } else {
            embed.setColor(0x00ff00);
            if(stdout.length > 0) {
                embed.addField("Stdout:", `\`\`\`js
${stdout}
\`\`\``);
            }
            if (stderr.length > 0) {
                embed.addField("Stderr:", `\`\`\`js
${stderr}
\`\`\``);
                embed.setColor(0xffff00);
            }
            channel.sendEmbed(embed);
            console.log(`Command ${query} finished with stdout:
${stdout}
and with stderr:
${stderr}`);
        }
    });
    } catch (err) {
        embed.setColor(0xff0000);
        embed.addField("Error:", `\`\`\`js
${err.toString()}
\`\`\``);
console.log(`Command ${query} finished with error in try / catch:
${err}`);
        channel.sendEmbed(embed);
    }
}
const {LoadEvents, LoadVariables, ExportEvent, ExportVariable, Storage, Flatten} = require("saltjs");
var protoSaltjs;
try { 
    protoSaltjs = require(auth.protoSaltjs);
} catch (err) {
    console.error("Could not load indev Saltjs from files.");
}
Discord.RichEmbed.prototype.oldSetDescription = function(text) {
    this.description = text;
    return this;
};
Discord.RichEmbed.prototype.setDescription = function(text, joinStr = "\n ... \n ... \n ... \n", sliceCount = 500, blankStr = "\u2064") {
    if(/^\s$/.test(blankStr)) {
        blankStr = "\u2064";
    }
    if(text.length === 0) {
        this.description = blankStr;
    } else if(text.length <= 1024) {
        this.description = text;
    } else {
        sliceCount = Math.min(sliceCount, 512);
        this.description = text.split``.slice(0, sliceCount).join`` + joinStr + text.split``.slice(- sliceCount).join``;
        if(this.description.length >= 1024) {
            this.description = text.split``.slice(0, 500).join`` + "\n ... \n ... \n ... \n" + text.split``.slice(-500).join``;
        }
    }
    return this;
};
Discord.RichEmbed.prototype.oldAddField = function(name, value, inline = false) {
    this.fields.push({name, value, inline});
    return this;
};
Discord.RichEmbed.prototype.addField = function(name, value, inline = false, joinStr = "\n ... \n ... \n ... \n", sliceCount = 500, blankStr = "\u2064") {
    if(/^\s$/.test(blankStr)) {
        blankStr = "\u2064";
    }
    if(name.length === 0) {
        name = blankStr;
    }
    if(value.length === 0) {
        value = blankStr;
    }
    if(value.length > 1024) {
        sliceCount = Math.min(sliceCount, 512);
        value = value.split``.slice(0, sliceCount).join`` + joinStr + value.split``.slice(- sliceCount).join``;
        if(value.length >= 1024) {
            value = value.split``.slice(0, 500).join`` + "\n ... \n ... \n ... \n" + value.split``.slice(-500).join``;
        }
    }
    if(name.length > 1024) {
        sliceCount = Math.min(sliceCount, 512);
        name = name.split``.slice(0, sliceCount).join`` + joinStr + name.split``.slice(- sliceCount).join``;
        if(name.length >= 1024) {
            name = name.split``.slice(0, 500).join`` + "\n ... \n ... \n ... \n" + name.split``.slice(-500).join``;
        }
    }
    this.fields.push({name, value, inline});
    return this;
};
/*END USEFUL STUFF*/
process.on("exit", function(code) {
    console.info(`Exiting process with exit code ${code}.`);
});
process.on("unhandledRejection", (rej, p)=>{
    console.error("Unhandled Rejection:\n"+rej);
    if (rej instanceof Error) {
        if (/Error:\sSomething took too long to do|read\sECONNRESET|EAI_AGAIN/i.test(rej.message)) {
            process.exit(1);
        }
    }
});
bot.on("ready", function() {
    console.log(`Ready and logged in as ${bot.user.username}#${bot.user.discriminator} (ID: ${bot.user.id})`);
    setInterval(function() {
        loadingIndex = (loadingIndex + 1) % loadingSymbols.length;
        for (let i in loading) {
            loading[i].seconds --;
            if (loading [i].seconds <= 0) {
                loading[i].msg.edit(loading[i].text);
                delete loading [i];
            } else {
                loading[i].msg.edit(`${loadingSymbols[loadingIndex]} (${loading[i].seconds} seconds left)`).catch(err => {
                    delete loading [i];
                });
            }
        }
    }, 1000);
});
bot.on("warn", console.warn);
bot.on("debug", console.info);
bot.on("message", function(message) {
    try {
        if(message.author.id === bot.user.id && message.channel.id === voteSpamChannel.id) {
            message.react("Upvote:256747855484551169");
        } else if(message.channel.id === voteSpamChannel.id) {
            message.react("Downvote:256747889672454146");
        }
        if(message.author.id !== bot.user.id) {
            return "screw you";
        }
        if(/^\/eval\s{1,4}[^]*$/i.test(message.content)) {
            var query = message.content.match(/^\/eval\s{1,4}([^]*)$/i)[1];
            var embed = new Discord.RichEmbed();
            var util = require("util");
            embed.setTitle("-=≡EVAL≡=-");
            embed.addField("Query:", `\`\`\`js
${query}
\`\`\``);
            var result;
            var utilResult;
            try {
                result = eval(query);
                embed.setColor(0x00ff00);
            } catch (err) {
                result = err.toString();
                embed.setColor(0xff0000);
            }
            try {
                utilResult = util.inspect(result, {
                    depth: 0
                });
            } catch (err) {
                utilResult = err.toString();
                embed.setColor(0xffff00);
            }
            embed.addField("Result:", `\`\`\`js
${(typeof result == "string") ? result.replace(new RegExp(_.escapeRegExp(auth.email), "gi"), "this.awesome.email@sham.wow").replace(new RegExp(_.escapeRegExp(auth.token), "gi"), "aBcD.eF.gHiJ") : result}
\`\`\``);
            embed.addField("Util:", `\`\`\`js
${utilResult.replace(new RegExp(_.escapeRegExp(auth.email), "gi"), "this.awesome.email@sham.wow").replace(new RegExp(_.escapeRegExp(auth.token), "gi"), "aBcD.eF.gHiJ")}
\`\`\``);
            message.edit({
                embed
            });
            console.log(`Eval of query ${query} finished with result:
${result}
and a util result of:
${utilResult}`);
        } else if(/^\/deepeval\s{1,4}[^]*$/i.test(message.content)) {
            var query = message.content.match(/^\/deepeval\s{1,4}([^]*)$/i)[1];
            var embed = new Discord.RichEmbed();
            var util = require("util");
            embed.setTitle("-=≡DEEP EVAL≡=-");
            embed.addField("Query:", `\`\`\`js
${query}
\`\`\``);
            var result;
            var utilResult;
            try {
                result = eval(query);
                embed.setColor(0x00ff00);
            } catch (err) {
                result = err.toString();
                embed.setColor(0xff0000);
            }
            try {
                utilResult = util.inspect(result);
            } catch (err) {
                utilResult = err.toString();
                embed.setColor(0xffff00);
            }
            embed.addField("Result:", `\`\`\`js
${(typeof result == "string") ? result.replace(new RegExp(_.escapeRegExp(auth.email), "gi"), "this.awesome.email@sham.wow").replace(new RegExp(_.escapeRegExp(auth.token), "gi"), "aBcD.eF.gHiJ") : result}
\`\`\``);
            embed.addField("Deep Util:", `\`\`\`js
${utilResult.replace(new RegExp(_.escapeRegExp(auth.email), "gi"), "this.awesome.email@sham.wow").replace(new RegExp(_.escapeRegExp(auth.token), "gi"), "aBcD.eF.gHiJ")}
\`\`\``);
            message.edit({
                embed
            });
            console.log(`Deep eval of query ${query} finished with result:
${result}
and a util result of:
${utilResult}`);
        } else if(/^\/cmd\s{1,4}[^]*$/i.test(message.content)) {
            var query = message.content.match(/^\/cmd\s{1,4}([^]*)$/i)[1];
            var embed = new Discord.RichEmbed();
            var cp = require("child_process");
            embed.setTitle("-=≡COMMAND LINE≡=-");
            embed.addField("Query:", `\`\`\`js
${query}
\`\`\``);
            try {
                cp.exec(query, (error, stdout, stderr) => {
                    if (error) {
                        embed.setColor(0xff0000);
                        embed.addField("Error:", `\`\`\`js
${error.toString()}
\`\`\``);
                        console.log(`Command ${query} finished with error:
${error}`);
                        message.edit({
                            embed
                        });
                } else {
                    embed.setColor(0x00ff00);
                    if(stdout.length > 0) {
                        embed.addField("Stdout:", `\`\`\`js
${stdout}
\`\`\``);
                    }
                    if (stderr.length > 0) {
                        embed.addField("Stderr:", `\`\`\`js
${stderr}
\`\`\``);
                        embed.setColor(0xffff00);
                    }
                    message.edit({
                        embed
                    });
                    console.log(`Command ${query} finished with stdout:
${stdout}
and with stderr:
${stderr}`);
                }
            });
            } catch (err) {
                embed.setColor(0xff0000);
                    embed.addField("Error:", `\`\`\`js
${err.toString()}
\`\`\``);
console.log(`Command ${query} finished with error in try / catch:
${err}`);
                    message.edit({
                        embed
                    });
            }
        } else if (/^\/justcmd\s{1,4}[^]*$/i.test(message.content)) {
            message.delete();
            var query = message.content.match(/^\/justcmd\s{1,4}([^]*)$/i)[1];
            var cp = require("child_process");
            try {
                cp.exec(query, (error, stdout, stderr) => {
                    if (error) {
                        console.log(`Command ${query} finished with error:
${error}`);
                    } else {
                        console.log(`Command ${query} finished with stdout:
${stdout}
and with stderr:
${stderr}`);
                    }
                });
            } catch (err) {
console.log(`Command ${query} finished with error in try / catch:
${err}`);
            }
        } else if (/^\/justeval\s{1,4}[^]*$/i.test(message.content)) {
            message.delete();
            var query = message.content.match(/^\/justeval\s{1,4}([^]*)$/i)[1];
            try {
                eval(query);
            } catch (err) {
                console.error(err);
            }
            console.log(`Just eval of query ${query} finished with result:
${result}`);
        } else if(/^\/xkcd(?:\s{1,4}(?:(?:random)|(?:\d+)))?$/i.test(message.content)) {
            if (/^\/xkcd$/i.test(message.content)) {
                request(`https://xkcd.com/info.0.json`, function (error, response, body) {
                    if (!error && response.statusCode == 200) {
                        var data;
                        try {
                            data = JSON.parse(body);
                        } catch (err) {
                            message.reply("Sorry but there was an error!");
                        }
                        var embed = new Discord.RichEmbed();
                        embed.setAuthor(data.num + ": " + data.safe_title, "http://xkcd.com/s/919f27.ico", `https://xkcd.com/${comicNum}`);
                        embed.setTitle("Explained");
                        embed.setURL("http://www.explainxkcd.com/wiki/index.php/" + data.num);
                        embed.setImage(data.img);
                        embed.setColor(0x7fff00);
                        embed.setDescription(`Published on ${data.month || "?"}/${data.day || "?"}/${data.year || "?"}`);
                        embed.setFooter(data.alt);
                        message.edit({
                            embed
                        });
                    } else {
                        message.reply("Sorry but there was an error!");
                        console.error(response.statusCode + "\n" + error);
                    }
                });
            } else {
                if(/random/i.test(message.content)) {
                    request("https://xkcd.com/info.0.json", function (error, response, body) {
                        if (!error && response.statusCode == 200) {
                            var data;
                            try {
                                data = JSON.parse(body);
                            } catch (err) {
                                message.reply("Sorry but there was an error!");
                            }
                            var comicNum = Math.floor(Math.random() * data.num) + 1;
                            request(`https://xkcd.com/${comicNum}/info.0.json`, function (error, response, body) {
                                if (!error && response.statusCode == 200) {
                                    var data;
                                    try {
                                        data = JSON.parse(body);
                                    } catch (err) {
                                        message.reply("Sorry but there was an error!");
                                    }
                                    var embed = new Discord.RichEmbed();
                                    embed.setAuthor(data.num + ": " + data.safe_title, "http://xkcd.com/s/919f27.ico", `https://xkcd.com/${comicNum}`);
                                    embed.setTitle("Explained");
                                    embed.setURL("http://www.explainxkcd.com/wiki/index.php/" + data.num);
                                    embed.setImage(data.img);
                                    embed.setColor(0x7fff00);
                                    embed.setDescription(`Published on ${data.month || "?"}/${data.day || "?"}/${data.year || "?"}`);
                                    embed.setFooter(data.alt);
                                    message.edit({
                                        embed
                                    });
                                } else {
                                    message.reply("Sorry but there was an error!");
                                    console.error(response.statusCode + "\n" + error);
                                }
                    });
                        } else {
                            message.reply("Sorry but there was an error!");
                            console.error(response.statusCode + "\n" + error);
                        }
                    });
                } else if(/\d+/i.test(message.content)) {
                    var comicNum = message.content.match(/^\/xkcd(?:\s{1,4}((?:random)|(?:\d+)))?$/i)[1];
                    request(`https://xkcd.com/${comicNum}/info.0.json`, function (error, response, body) {
                        if (!error && response.statusCode == 200) {
                            var data;
                            try {
                                data = JSON.parse(body);
                            } catch (err) {
                                message.reply("Sorry but there was an error!");
                            }
                            var embed = new Discord.RichEmbed();
                            embed.setAuthor(data.num + ": " + data.safe_title, "http://xkcd.com/s/919f27.ico", `https://xkcd.com/${comicNum}`);
                            embed.setTitle("Explained");
                            embed.setURL("http://www.explainxkcd.com/wiki/index.php/" + data.num);
                            embed.setImage(data.img);
                            embed.setColor(0x7fff00);
                            embed.setDescription(`Published on ${data.month || "?"}/${data.day || "?"}/${data.year || "?"}`);
                            embed.setFooter(data.alt);
                            message.edit({
                                embed
                            });
                        } else {
                            message.reply("Sorry but there was an error!");
                            console.error(response.statusCode + "\n" + error);
                        }
                    });
                }
            }
        } else if (/^\/loading\s{1,4}\d+\s{1,4}[^]+$/i.test(message.content)) {
            var oldContent = message.content;
            message.edit("Loading...").then(v => {
                loading[v.id] = {
                    msg: v,
                    seconds: + oldContent.match(/^\/loading\s{1,4}(\d+)\s{1,4}[^]+/i)[1],
                    text: oldContent.match(/^\/loading\s{1,4}\d+\s{1,4}([^]+)/i)[1]
                };
            });
        } else if (/^\/urban\s{1,4}[^]+$/i.test(message.content)) {
            var word = message.content.match(/^\/urban\s{1,4}([^]+)$/i)[1];
            request({
                url: "https://mashape-community-urban-dictionary.p.mashape.com/define?term=" + word,
                headers: {
                    "X-Mashape-Key": "Y4qbXwffCimshPPJWgi08ndPOTa5p1oQcmQjsnM3GD5trHpgYQ",
                    "Accept": "text/plain"
                }
            }, function(error, response, body) {
                if(!error && response.statusCode == 200) {
                    var embed = new Discord.RichEmbed();
                    embed.setAuthor(word, "http://www.urbandictionary.com/favicon.ico");
                    var data;
                    try {
                        data = JSON.parse(body);
                    } catch (err) {
                        message.delete();
                    }
                    if(data.result_type === "no_results") {
                        embed.setColor(0xff0000);
                        embed.setThumbnail("https://cdn.discordapp.com/attachments/239114198494216192/270315597512835073/unknown.png");
                        embed.setDescription("According to Urban Dictionary.");
                        embed.addField("Definition:", "This word is not defined.");
                        message.edit({
                            embed
                        });
                    } else {
                        var result = data.list[0];
                        embed.setColor(0x00ff00);
                        embed.setThumbnail("https://cdn.discordapp.com/attachments/239114198494216192/270315597512835073/unknown.png");
                        embed.setDescription("According to Urban Dictionary.");
                        embed.setAuthor(word, "http://www.urbandictionary.com/favicon.ico" , result.permalink);
                        embed.addField("Definition:", result.definition);
                        embed.addField("Example:", result.example);
                        embed.addField("👍🏼", String(result.thumbs_up), true);
                        embed.addField("👎🏼", String(result.thumbs_down), true);
                        embed.addField("Overall Score", String(result.thumbs_up - result.thumbs_down), true);
                        embed.addField("Score Ratio", (result.thumbs_down === 0) ? "Infinity / Undefined - Divide By 0" : `${Math.round((result.thumbs_up / result.thumbs_down) * 100) / 100} or ${Math.round(result.thumbs_up / result.thumbs_down * 100)}%`, true);
                        embed.setFooter("Written by " + result.author);
                        message.edit({
                            embed
                        });
                    }
                } else {
                    message.delete();
                }
            });
        } else if (/^\/reply(?:\s{1,4}\d+)?\s{1,4}[^]+$/i.test(message.content)) {
            var id = message.content.match(/^\/reply(?:\s{1,4}(\d+))?\s{1,4}[^]+$/i)[1];
            var text = message.content.match(/^\/reply(?:\s{1,4}\d+)?\s{1,4}([^]+)$/i)[1];
            message.channel.fetchMessages().then(v => {
                v = new Storage(v);
                if(v.get(id)) {
                    var msg = v.get(id);
                    var embed = new Discord.RichEmbed();
                    embed.setAuthor(`${msg.author.username}#${message.author.discriminator} (ID: ${msg.author.id}) said...`, msg.author.displayAvatarURL);
                    embed.setDescription(msg.content);
                    embed.setColor(0x00ff00);
                    if(msg.attachments.size > 0) {
                        embed.setImage(msg.attachments.first().url);
                    }
                    message.edit(msg.author.toString() + ", " + text, {
                        embed
                    });
                } else if (id === undefined) {
                    var msg = v.nth(1);
                    var embed = new Discord.RichEmbed();
                    embed.setAuthor(`${msg.author.username}#${message.author.discriminator} (ID: ${msg.author.id}) said...`, msg.author.displayAvatarURL);
                    embed.setDescription(msg.content);
                    embed.setColor(0x00ff00);
                    if(msg.attachments.size > 0) {
                        embed.setImage(msg.attachments.first().url);
                    }
                    message.edit(msg.author.toString() + ", " + text, {
                        embed
                    });
                } else if ((+ id) <= 49) {
                    var msg = v.nth(+ id);
                    var embed = new Discord.RichEmbed();
                    embed.setAuthor(`${msg.author.username}#${message.author.discriminator} (ID: ${msg.author.id}) said...`, msg.author.displayAvatarURL);
                    embed.setDescription(msg.content.length > 1024 ? msg.content.split``.slice(0, 500).join`` + "\n ... \n ... \n ... \n" + msg.content.split``.slice(-500).join`` : msg.content);
                    embed.setColor(0x00ff00);
                    if(msg.attachments.size > 0) {
                        embed.setImage(msg.attachments.first().url);
                    }
                    message.edit(msg.author.toString() + ", " + text, {
                        embed
                    });
                } else {
                    message.delete();
                }
            });
        } else if(/^\/define\s{1,4}[^]+$/i.test(message.content)) {
            var word = message.content.match(/^\/define\s{1,4}([^]+)$/i)[1];
            var embed = new Discord.RichEmbed();
            request("http://wordnetweb.princeton.edu/perl/webwn?s=" + word, function(error, response, body) {
                var $;
                try {
                    $ = cheerio.load(body);
                } catch (err) {
                    message.delete();
                } 
                if (!error && response.statusCode == 200 && $("ul").length > 0) {
                    embed.setColor(0x00ff00);
                    embed.setDescription("According to Princeton Wordnet.");
                    embed.setThumbnail("https://byelka.files.wordpress.com/2013/07/wordnet.png");
                    embed.setAuthor("Definition of " + word, "https://www.princeton.edu/main/favicon.ico", "http://wordnetweb.princeton.edu/perl/webwn?s=" + word);
                    var def = "```\n" + $("ul").text() + "\n```";
                    embed.addField("Definition:", def);
                    message.edit({
                        embed
                    });
                } else if ($("ul").length === 0) {
                    embed.setColor(0xff0000);
                    embed.setDescription("According to Princeton Wordnet.");
                    embed.setThumbnail("https://byelka.files.wordpress.com/2013/07/wordnet.png");
                    embed.setAuthor("Definition of " + word, "https://www.princeton.edu/main/favicon.ico");
                    embed.addField("Definition:", "Word is not defined.");
                    message.edit({
                        embed
                    });
                } else {
                    message.delete();
                }
            });
        } else if(/^\/yt\s{1,4}[^]+$/i.test(message.content)) {
            var query = message.content.match(/^\/yt\s{1,4}([^]+)$/i)[1];
            var embed = new Discord.RichEmbed();
            yt.search(query, 1, function(error, response) {
                if(error) {
                    message.delete();
                } else {
                    if(response.totalResults === 0) {
                        embed.setColor(0xff0000);
                        embed.setAuthor(query);
                        embed.setDescription("This video does not exist.");
                        message.edit({
                            embed
                        });
                    } else {
                        var video = response.items[0];
                        embed.setColor(0x00ff00);
                        var duration;
                        var channelIcon;
                        request(`https://www.googleapis.com/youtube/v3/videos?id=${video.id.videoId}&part=contentDetails&key=AIzaSyBEoCGfMtQijBFIDMj59EvP8TKs1Fp6fUc`, function(error, response, body) {
                            if(!error && response.statusCode == 200) {
                                var data;
                                try {
                                    data = JSON.parse(body);
                                } catch (err) {
                                    duration = "Unknown";
                                    embed.setColor(0xffff00);
                                }
                                if(data.items[0] === undefined) {
                                    duration = "Unknown";
                                }
                                if(duration !== "Unknown") {
                                    duration = data.items[0].contentDetails.duration.split``.slice(2).join``.match(/\d+\w/g).join`, `;
                                }
                            } else {
                                duration = "Unknown";
                                embed.setColor(0xffff00);
                            }
                            request(`https://www.googleapis.com/youtube/v3/channels?part=snippet&id=${video.snippet.channelId}&key=AIzaSyBEoCGfMtQijBFIDMj59EvP8TKs1Fp6fUc`, function(error, response, body) {
                                if(!error && response.statusCode == 200) {
                                    var data;
                                    try {
                                        data = JSON.parse(body);
                                    } catch (err) {
                                        channelIcon = "https://www.youtube.com/yt/brand/media/image/YouTube-icon-full_color.png";
                                        embed.setColor(0xffff00);
                                    }
                                    if(channelIcon !== "https://www.youtube.com/yt/brand/media/image/YouTube-icon-full_color.png") {
                                        channelIcon = data.items[0].snippet.thumbnails.high.url;
                                    }
                                } else {
                                    channelIcon = "https://www.youtube.com/yt/brand/media/image/YouTube-icon-full_color.png";
                                    embed.setColor(0xffff00);
                                }
                                embed.setAuthor(video.snippet.title, channelIcon, "https://www.youtube.com/watch?v=" + video.id.videoId);
                                embed.setThumbnail(video.snippet.thumbnails.high.url);
                                embed.setTimestamp(new Date(video.snippet.publishedAt));
                                embed.addField("Channel ID:", video.snippet.channelId || "Unknown", true);
                                embed.addField("Video ID:", video.id.videoId || "Unknown");
                                embed.addField("Channel:", `[**${video.snippet.channelTitle}**](https://www.youtube.com/channel/${video.snippet.channelId})`, true);
                                embed.addField("Duration:", duration);
                                embed.addField("Description:", video.snippet.description);
                                message.edit({
                                    embed
                                });
                            });
                        });
                    }
                }
            });
        } else if (/^\/mdn\s{1,4}[^]+$/i.test(message.content)) {
            var query = message.content.match(/^\/mdn\s{1,4}([^]+)$/i)[1];
            request("https://developer.mozilla.org/en-US/search.json?locale=en-US&highlight=false&q=" + encodeURIComponent(query), function(error, response, body) {
                if(!error && response.statusCode == 200) {
                    var embed = new Discord.RichEmbed();
                    embed.setAuthor(query, "https://developer.cdn.mozilla.net/static/img/favicon32.e02854fdcf73.png");
                    embed.setThumbnail("https://tentacu.files.wordpress.com/2015/03/mdn_logo-wordmark-full_color.jpg");
                    var data;
                    try {
                        data = JSON.parse(body);
                    } catch (err) {
                        message.delete();
                    }
                    if(data.count === 0) {
                        embed.setColor(0xff0000);
                        embed.setDescription("According to MDN (Mozilla Developer Network).");
                        embed.addField("Reference:", "This term is not in MDN.");
                        message.edit({
                            embed
                        });
                    } else {
                        var result = data.documents[0];
                        embed.setColor(0x00ff00);
                        embed.setDescription("According to MDN (Mozilla Developer Network).");
                        embed.setAuthor(result.title, "https://developer.cdn.mozilla.net/static/img/favicon32.e02854fdcf73.png", result.url);
                        embed.addField("Reference:", result.excerpt);
                        embed.addField("Tags:", result.tags.join`, `, true);
                        embed.addField("Search Score:", String(result.score), true);
                        embed.addField("More Results:", `[**Click here!**](https://developer.mozilla.org/en-US/search?locale=en-US&highlight=false&q=${encodeURIComponent(query)})`);
                        console.log(embed);
                        message.edit({
                            embed
                        });
                    }
                } else {
                    message.delete();
                }
            });
        } else if (/^\/reverse\s{1,4}[^]+$/i.test(message.content)) {
            var term = message.content.match(/^\/reverse\s{1,4}([^]+)$/i)[1];
            message.edit(term.split``.reverse().join``);
        } else if (/^\/spaceOut\s{1,4}[^]+$/i.test(message.content)) {
            var term = message.content.match(/^\/spaceout\s{1,4}([^]+)$/i)[1];
            message.edit(term.split``.join` `);
        } else if (/^\/regional\s{1,4}[^]+$/i.test(message.content)) {
            var term = message.content.match(/^\/regional\s{1,4}([^]+)$/i)[1];
            var regionals = new Storage(selfJSON.regionals);
            message.edit(term.split``.map(v => regionals.get(v.toLowerCase()) || v).join``);
        } else if (/^\/regionalspace\s{1,4}[^]+$/i.test(message.content)) {
            var term = message.content.match(/^\/regionalspace\s{1,4}([^]+)$/i)[1];
            var regionals = new Storage(selfJSON.regionals);
            message.edit(term.split``.map(v => regionals.get(v.toLowerCase()) || v).join` `);
        } else if (/^\/jsbeautify\s{1,4}[^]+$/.test(message.content)) {
            var code = message.content.match(/^\/jsbeautify\s{1,4}([^]+)$/)[1];
            message.edit("```js\n" + require("js-beautify").js_beautify(code, { indent_size: 2 }) + "\n```");
        } else if (/^\/latency$/i.test(message.content)) {
    		request("https://status.discordapp.com/", (err, resp, body)=>{
    			if (!err && resp.statusCode === 200) {
    				let $ = cheerio.load(body);
    				let embed = new Discord.RichEmbed();
    				embed.setAuthor("Discord Status", "http://is2.mzstatic.com/image/thumb/Purple111/v4/09/9a/70/099a7006-64c4-a170-de06-42d859a2af9d/source/175x175bb.jpg", "https://status.discordapp.com");
    				if ($(".page-status.status-none").length > 0) {
    						embed.setColor(0x56A270)
    						.setTitle("All systems operational")
    						.setDescription("👍🏼");
    					message.edit("", {embed});
    				} else {
    					let incident = $(".unresolved-incident");
    					let classes = incident.attr("class").split(" ");
    					let _$ = cheerio.load(incident.html());
    					let title = cheerio.load(_$(".incident-title").html());
    					title = title(".actual-title");
    					let description = cheerio.load(_$(".updates").html());
    					description = description(".update").html().replace(/<strong>([^]+)<\/strong>/g, "**$1**").replace(/<small>[^]+<\/small>/g, "").replace(/<br(?:\s?\/)?>/g, "\n").replace(/"/g, "");
    					let decode = require("html-entities").AllHtmlEntities;
    					decode = new decode().decode;
    					embed.setTitle(title.text())
    					.setDescription(decode(description));
    					let color;
    					switch(classes[1]){
    						case "impact-none":
    							color=0x333333;
    							break;
    						case "impact-critical":
    							color=0xf04747;
    							break;
    						case "impact-major":
    							color=0xf26522;
    							break;
    						case "impact-minor":
    							color=0xfaa61a;
    							break;
    						case "impact-maintenance":
    							color=0x3498DB;
    							break;
    					}
    					if (color) embed.setColor(color);
    					message.edit({
    					    embed
    					});
    				}
    			} else {
    				message.delete();
    			}
    		});
		} else if (/^\/etag\s{1,4}(?:(?:add)|(?:a)|(?:\+)|(?:set)|(?:assign))\s{1,4}"[^]+?"\s{1,4}[^]+$/i.test(message.content)) {
		    message.delete();
		    selfJSON.tags[message.content.match(/^\/etag\s{1,4}(?:(?:add)|(?:a)|(?:\+)|(?:set)|(?:assign))\s{1,4}"([^]+?)"\s{1,4}[^]+$/i)[1]] = {
		        text: message.content.match(/^\/etag\s{1,4}(?:(?:add)|(?:a)|(?:\+)|(?:set)|(?:assign))\s{1,4}"[^]+?"\s{1,4}([^]+)$/i)[1],
		        attachment: (message.attachments.first() || {"url": ""}).url
		    };
		    fs.writeFileSync("selfbot.json", JSON.stringify(selfJSON), "utf8");
		} else if (/^\/etag\s{1,4}(?:(?:remove)|(?:d)|(?:-)|(?:r)|(?:delete))\s{1,4}[^]+$/i.test(message.content)) {
		    message.delete();
		    delete selfJSON.tags[message.content.match(/^\/etag\s{1,4}(?:(?:remove)|(?:d)|(?:-)|(?:r)|(?:delete))\s{1,4}([^]+)$/i)[1]];
		    fs.writeFileSync("selfbot.json", JSON.stringify(selfJSON), "utf8");
 		} else if (/^\/t\s{1,4}[^]+$/i.test(message.content)) {
		    var term = message.content.match(/^\/t\s{1,4}([^]+)$/i)[1];
		    if (term in selfJSON.tags) {
		        if(selfJSON.tags[term].attachment) {
		            var embed = new Discord.RichEmbed();
		            embed.setDescription(selfJSON.tags[term].text);
		            embed.setImage(selfJSON.tags[term].attachment);
		            embed.setColor(0x00ff00);
		            message.edit({
		                embed
		            });
		        } else {
		            message.edit(selfJSON.tags[term].text);
		        }
		    } else {
		        message.delete();
		    }
		} else if (/^\/npm\s{1,4}[-a-zA-Z0-9\.]+$/i.test(message.content)) {
		    var term = message.content.match(/^\/npm\s{1,4}([-a-zA-Z0-9\.]+)$/i)[1];
		    var embed = new Discord.RichEmbed();
            request("https://www.npmjs.com/package/" + term, function(error, response, body) {
                var $;
                try {
                    $ = cheerio.load(body);
                } catch (err) {
                    message.delete();
                } 
                if (!error && response.statusCode == 200) {
                    embed.setColor(0x00ff00);
                    embed.setDescription($("p.package-description").text());
                    embed.setThumbnail(Storage.fromObject($("ul li a img")).filter((v, i) => ! isNaN(+ i)).find(v => v.attribs.alt === $("img+span").text()).attribs.src);
                    embed.setAuthor(term, "https://www.npmjs.com/static/images/touch-icons/favicon-96x96.png", "https://www.npmjs.com/package/" + term);
                    embed.addField("Last Publisher:", $("img+span").text(), true);
                    embed.addField("Published:", moment($("div+ul li a+span").attr("data-date")).fromNow(), true);
                    embed.addField("Version:", $("div.sidebar li.last-publisher+li strong").text(), true);
                    embed.addField("GitHub:", `[**Click Here!**](${$("div.sidebar li.last-publisher+li+li a").attr("src")})`, true);
                    embed.addField("License:", $("div.sidebar li.last-publisher+li+li+li a").text(), true, undefined, undefined, "None");
                    embed.addField("Collaborators:", Storage.fromObject($(".humans.collaborators li a")).filter((v, i) => ! isNaN(+ i)).map(v => v.attribs.title).join`, `, true);
                    embed.addField("Downloads:", `**${commaify($(".pretty-number.daily-downloads").text())}**/day   **${commaify($(".pretty-number.weekly-downloads").text())}**/week   **${commaify($(".pretty-number.monthly-downloads").text())}**/month`, true);
                    embed.addField("Open Issues:", `[**Click Here!**](${$("#issues .enhanced a").attr("href")})`, true);
                    embed.addField("Pull Requests:", `[**Click Here!**](${$("#pull_requests a").attr("href")})`, true);
                    embed.addField("Dependencies:", $("ul+h3+.list-of-links+h3+.list-of-links").text().replace(/[\n\s]/g, "").replace(/,/g, ", "), true);
                    embed.addField("Keywords:", $("ul+h3+.list-of-links").text().replace(/[\n\s]/g, "").replace(/,/g, ", "), true);
                    embed.setImage(`https://nodei.co/npm/${term}.svg?downloadRank=true&downloads=true&stars=true`);
                    embed.setTimestamp(new Date($("div+ul li a+span").attr("data-date")));
                    message.edit({
                        embed
                    });
                } else if (response.statusCode == 404) {
                    embed.setColor(0xff0000);
                    embed.setDescription("Package not found.");
                    embed.setThumbnail("https://www.npmjs.com/static/images/touch-icons/favicon-96x96.png");
                    embed.setAuthor(term, "https://www.npmjs.com/static/images/touch-icons/favicon-230x230.png", "https://www.npmjs.com/package/" + term);
                    message.edit({
                        embed
                    });
                } else {
                    message.delete();
                }
            });
		} else if (/^\/badge\s.+$/i.test(message.content)) {
		    var term = message.content.match(/^\/badge\s(.+)$/i)[1];
            var embed = new Discord.RichEmbed();
            embed.setColor(0x00ff00);
            embed.setImage(`https://img.shields.io/badge/${encodeURIComponent(term)}.png`);
            embed.setTitle("Badge");
            message.edit({
                embed
            });
		} else if (/^\/colorlog\s"[a-zA-Z\.]+?"\s[^]+/i.test(message.content)) {
		    message.delete();
		    console.log((_.at(chalk, message.content.match(/^\/colorlog\s"([a-zA-Z\.]+?)"\s[^]+/i)[1])[0])((message.content.match(/^\/colorlog\s"[a-zA-Z\.]+?"\s([^]+)/i)[1])));
		} else if(/^\/restart$/i.test(message.content)) {
            message.delete().then(v => {
                console.log("Restarting bot due to restart command.");
                process.exit(12321);
            });
        }
    } catch (err) {
        console.error(err.toString());
    }
});
bot.login(auth.token);