# Adding telegram support for handling messages for user

1. First we need to add button at Profile management section Add Telegram bot
2. When user click on Add Telegram bot so electron app show user gif with creating bot for telegram and how to get API
3. When user get HTTP API from "@BotFather"(its must be like a link to telegram bot conversation) paste to placeholder and app store this key for current Profile at its Setting folder.
4. Lets create a simple folder for each profile with name of this profile as name of folder + move inside of folder cookies, search data saves, images, telegram API data with dialogue id
5. When User paste HTTP API and process API connections frontend server or electron use https://api.telegram.org/botHTTP API/getUpdates and fetch json with data like this `{"ok":true,"result":[{"update_id":51655371,"message":{"message_id":2,"from":{"id":5114215836,"is_bot":false,"first_name":"Ivan","username":"vantanama","language_code":"ru"},"chat":{"id":5114215836,"first_name":"Ivan","username":"vantanama","type":"private"},"date":1759602476,"text":"\u043f\u0440\u0438\u0432\u0435\u0442"}}]}`, where 5114215836 for me is current id where bot will send info and for check connection it must use https://api.telegram.org/botHTTP API/sendMessage?chat_id=5114215836&text=Hey there from API!,  save this data with Profile setting
## !!Code must be with english comments in NatSpec style
