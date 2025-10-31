// ==UserScript==
// @name         Item Notifier
// @include      https://www.strrev.com/
// @namespace    https://www.strrev.com/
// @version      0.1
// @description  Notifies user when new items are available.
// @author       eternal45
// @match        *://www.strrev.com/*
// @icon         https://www.strrev.com/uploads/badges/67f1635745edc_stratus%20S%20logo.png
// @grant        none
// @updateURL    https://raw.githubusercontent.com/eternal-45/doblox-notif/main/dobloxnotifier.js
// @downloadURL  https://raw.githubusercontent.com/eternal-45/doblox-notif/main/dobloxnotifier.js
// ==/UserScript==

(function() {
    'use strict';

    const categoryApiUrl = 'https://www.doblox.xyz/apisite/catalog/v1/search/items?category=Featured&limit=28&sortType=0';
    const itemDetailsApiUrl = 'https://www.doblox.xyz/apisite/catalog/v1/catalog/items/details';
    const thumbnailApiUrl = 'https://www.doblox.xyz/apisite/thumbnails/v1/assets';

    function getLastSeenItemId() {
        return localStorage.getItem('lastSeenItemId');
    }

    function setLastSeenItemId(itemId) {
        localStorage.setItem('lastSeenItemId', itemId);
    }

    async function getCsrfToken() {
        try {
            const response = await fetch(itemDetailsApiUrl, {
                method: 'POST',
                credentials: 'include'
            });
            return response.headers.get('x-csrf-token');
        } catch (error) {
            console.error('Failed to fetch CSRF token:', error);
            return null;
        }
    }

    async function fetchItems() {
        try {
            const csrfToken = await getCsrfToken();
            const headers = {
                'Content-Type': 'application/json'
            };
            if (csrfToken) {
                headers['X-Csrf-Token'] = csrfToken;
            }

            const response = await fetch(categoryApiUrl, {
                method: 'GET',
                headers: headers
            });
            if (!response.ok) throw new Error('Network response was not ok');

            const data = await response.json();
            if (data.data && data.data.length > 0) {
                await checkForNewItems(data.data);
            }
        } catch (error) {
            console.error('Failed to fetch items:', error);
        }
    }

    async function checkForNewItems(items) {
        const mostRecentItem = items[0];
        const lastSeenItemId = getLastSeenItemId();
        if (!lastSeenItemId || mostRecentItem.id > lastSeenItemId) {
            setLastSeenItemId(mostRecentItem.id);
            setTimeout(async () => {
                await notifyUser(mostRecentItem.id);
            }, 500);
        }
    }

    async function fetchItemDetails(itemId) {
        try {
            const csrfToken = await getCsrfToken();
            const headers = {
                'Content-Type': 'application/json',
                'X-Csrf-Token': csrfToken
            };

            const payload = {
                items: [{ itemType: "Asset", id: itemId }]
            };

            const response = await fetch(itemDetailsApiUrl, {
                method: 'POST',
                headers: headers,
                body: JSON.stringify(payload),
                credentials: 'include'
            });
            if (!response.ok) throw new Error('Network response was not ok');

            const data = await response.json();
            const itemData = data.data && data.data.length > 0 ? data.data[0] : null;
            const itemName = itemData ? itemData.name : 'Unknown Item';
            const isLimitedUnique = itemData && itemData.itemRestrictions.includes('LimitedUnique');
            const itemPrice = itemData ? itemData.price : 'Unknown Price';

            const thumbnailResponse = await fetch(`${thumbnailApiUrl}?assetIds=${itemId}&format=png&size=420x420`);
            if (!thumbnailResponse.ok) throw new Error('Network response was not ok');

            const thumbnailData = await thumbnailResponse.json();
            const itemImage = thumbnailData.data && thumbnailData.data.length > 0 ? `https://www.doblox.xyz${thumbnailData.data[0].imageUrl}` : '';

            return { itemName, itemImage, isLimitedUnique, itemPrice };
        } catch (error) {
            console.error('Failed to fetch item details:', error);
            return { itemName: 'Unknown Item', itemImage: '', isLimitedUnique: false, itemPrice: 'Unknown Price' };
        }
    }

    async function notifyUser(itemId) {
        const { itemName, itemImage, isLimitedUnique, itemPrice } = await fetchItemDetails(itemId);
        const notification = new Notification(`New Item Available! Price: ${itemPrice} R$!`, {
            body: `Press this notification to be redirected to ${itemName}. ${isLimitedUnique ? 'This item is Limited Unique!' : 'This item is not Limited Unique.'}`,
            icon: itemImage
        });

        notification.onclick = () => {
            window.open(`https://www.doblox.xyz/catalog/${itemId}/Notify`);
        };
    }

    function requestNotificationPermission() {
        if (Notification.permission === 'default') {
            Notification.requestPermission();
        }
    }

    function init() {
        requestNotificationPermission();
        setInterval(fetchItems, 1500);
    }

    init();
})();
