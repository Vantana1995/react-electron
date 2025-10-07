я хочу изменить на фронте отображение, не буду использовать нфт скрипт пара, вот они сейчас приходят двумя обьектами и их так и будем добавлять в массив к примеру в мемори
Вот как нужно сделать

// Expose currentNFT and currentScript to window object for component access
this we need to remove ↓
// Sync with window.nftScriptPairs from serverApiService

here // Показываем секцию профилей сразу после успешного подключения we need to check for global maxProfiles because it can be setup early

Check how we pack data before sent

`// Modernized NFT+Script handling - check for new nftScriptPairs first` check how we get scripts with nfts from backend part, i think we must get object with nft and scrip inside or with only script or with only maxProfile
I think we didnt get `data.**nftScriptPairs**`

Я считаю что мы когда получаем скрипт с нфт в одном обьекте должны их так и добавлять в мемори

Возможно так и будем добавлять обьектами и уже обьекты использовать в нфтОтображении в приложении, а при поступлении нового обьекта мы добавляем его в конец списка и проверяем есть ли новые скрипты или новые нфт или максимально количество профилей больше

При получении в вызове макс профилей мы устанавливаем их глобально для приложения на этот раз когда мы открыли ее, если в каком либо из обьектов есть количество пользователей больше оно устанавливается автоматически, у каждого скрипта свой собственный счетчик активных скриптов одновременно
