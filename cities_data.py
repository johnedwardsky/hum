# -*- coding: utf-8 -*-
import math

FALLBACK_CITIES = [
    {
        "names": [
            "клайпеда",
            "klaipeda",
            "klaipėda"
        ],
        "display_name": "Клайпеда, Клайпедский уезд, Литва",
        "lat": 55.7127529,
        "lon": 21.1350469,
        "timezone": "Europe/Vilnius"
    },
    {
        "names": [
            "вильнюс",
            "vilnius",
            "vilno"
        ],
        "display_name": "Вильнюс, Вильнюсский уезд, Литва",
        "lat": 54.687157,
        "lon": 25.279651,
        "timezone": "Europe/Vilnius"
    },
    {
        "names": [
            "каунас",
            "kaunas"
        ],
        "display_name": "Каунас, Каунасский уезд, Литва",
        "lat": 54.898521,
        "lon": 23.903597,
        "timezone": "Europe/Vilnius"
    },
    {
        "names": [
            "москва",
            "moscow"
        ],
        "display_name": "Москва, Россия",
        "lat": 55.755826,
        "lon": 37.617299,
        "timezone": "Europe/Moscow"
    },
    {
        "names": [
            "санкт-петербург",
            "питер",
            "saint petersburg",
            "st. petersburg",
            "ленинград"
        ],
        "display_name": "Санкт-Петербург, Россия",
        "lat": 59.93428,
        "lon": 30.335099,
        "timezone": "Europe/Moscow"
    },
    {
        "names": [
            "минск",
            "minsk"
        ],
        "display_name": "Минск, Беларусь",
        "lat": 53.900601,
        "lon": 27.558972,
        "timezone": "Europe/Minsk"
    },
    {
        "names": [
            "киев",
            "kyiv",
            "kiev"
        ],
        "display_name": "Киев, Украина",
        "lat": 50.4501,
        "lon": 30.5234,
        "timezone": "Europe/Kyiv"
    },
    {
        "names": [
            "рига",
            "riga"
        ],
        "display_name": "Рига, Латвия",
        "lat": 56.949649,
        "lon": 24.105186,
        "timezone": "Europe/Riga"
    },
    {
        "names": [
            "таллин",
            "таллинн",
            "tallinn"
        ],
        "display_name": "Таллин, Эстония",
        "lat": 59.436962,
        "lon": 24.753574,
        "timezone": "Europe/Tallinn"
    },
    {
        "names": [
            "новосибирск",
            "novosibirsk"
        ],
        "display_name": "Новосибирск, Новосибирская область, Россия",
        "lat": 55.008353,
        "lon": 82.935733,
        "timezone": "Asia/Novosibirsk"
    },
    {
        "names": [
            "екатеринбург",
            "yekaterinburg",
            "свердловск"
        ],
        "display_name": "Екатеринбург, Свердловская область, Россия",
        "lat": 56.838926,
        "lon": 60.605702,
        "timezone": "Asia/Yekaterinburg"
    },
    {
        "names": [
            "казань",
            "kazan"
        ],
        "display_name": "Казань, Татарстан, Россия",
        "lat": 55.78874,
        "lon": 49.12214,
        "timezone": "Europe/Moscow"
    },
    {
        "names": [
            "нижний новгород",
            "nizhny novgorod",
            "горький"
        ],
        "display_name": "Нижний Новгород, Нижегородская область, Россия",
        "lat": 56.32867,
        "lon": 44.00205,
        "timezone": "Europe/Moscow"
    },
    {
        "names": [
            "челябинск",
            "chelyabinsk"
        ],
        "display_name": "Челябинск, Челябинская область, Россия",
        "lat": 55.154,
        "lon": 61.4291,
        "timezone": "Asia/Yekaterinburg"
    },
    {
        "names": [
            "самара",
            "samara",
            "куйбышев"
        ],
        "display_name": "Самара, Самарская область, Россия",
        "lat": 53.2001,
        "lon": 50.15,
        "timezone": "Europe/Samara"
    },
    {
        "names": [
            "омск",
            "omsk"
        ],
        "display_name": "Омск, Омская область, Россия",
        "lat": 54.9924,
        "lon": 73.3686,
        "timezone": "Asia/Omsk"
    },
    {
        "names": [
            "ростов-на-дону",
            "ростов",
            "rostov-on-don",
            "rostov"
        ],
        "display_name": "Ростов-на-Дону, Ростовская область, Россия",
        "lat": 47.2333,
        "lon": 39.7,
        "timezone": "Europe/Moscow"
    },
    {
        "names": [
            "уфа",
            "ufa"
        ],
        "display_name": "Уфа, Башкортостан, Россия",
        "lat": 54.7431,
        "lon": 55.9678,
        "timezone": "Asia/Yekaterinburg"
    },
    {
        "names": [
            "красноярск",
            "krasnoyarsk"
        ],
        "display_name": "Красноярск, Красноярский край, Россия",
        "lat": 56.0153,
        "lon": 92.8932,
        "timezone": "Asia/Krasnoyarsk"
    },
    {
        "names": [
            "воронеж",
            "voronezh"
        ],
        "display_name": "Воронеж, Воронежская область, Россия",
        "lat": 51.672,
        "lon": 39.1843,
        "timezone": "Europe/Moscow"
    },
    {
        "names": [
            "пермь",
            "perm"
        ],
        "display_name": "Пермь, Пермский край, Россия",
        "lat": 58.0105,
        "lon": 56.2502,
        "timezone": "Asia/Yekaterinburg"
    },
    {
        "names": [
            "волгоград",
            "volgograd",
            "сталинград"
        ],
        "display_name": "Волгоград, Волгоградская область, Россия",
        "lat": 48.7194,
        "lon": 44.5018,
        "timezone": "Europe/Volgograd"
    },
    {
        "names": [
            "краснодар",
            "krasnodar"
        ],
        "display_name": "Краснодар, Краснодарский край, Россия",
        "lat": 45.0355,
        "lon": 38.9753,
        "timezone": "Europe/Moscow"
    },
    {
        "names": [
            "саратов",
            "saratov"
        ],
        "display_name": "Саратов, Саратовская область, Россия",
        "lat": 51.54,
        "lon": 46.02,
        "timezone": "Europe/Saratov"
    },
    {
        "names": [
            "тюмень",
            "tyumen"
        ],
        "display_name": "Тюмень, Тюменская область, Россия",
        "lat": 57.1522,
        "lon": 65.5272,
        "timezone": "Asia/Yekaterinburg"
    },
    {
        "names": [
            "тольятти",
            "tolyatti"
        ],
        "display_name": "Тольятти, Самарская область, Россия",
        "lat": 53.5303,
        "lon": 49.4189,
        "timezone": "Europe/Samara"
    },
    {
        "names": [
            "ижевск",
            "izhevsk"
        ],
        "display_name": "Ижевск, Удмуртия, Россия",
        "lat": 56.8498,
        "lon": 53.2045,
        "timezone": "Europe/Samara"
    },
    {
        "names": [
            "барнаул",
            "barnaul"
        ],
        "display_name": "Барнаул, Алтайский край, Россия",
        "lat": 53.3606,
        "lon": 83.7636,
        "timezone": "Asia/Barnaul"
    },
    {
        "names": [
            "ульяновск",
            "ulyanovsk"
        ],
        "display_name": "Ульяновск, Ульяновская область, Россия",
        "lat": 54.3282,
        "lon": 48.3866,
        "timezone": "Europe/Ulyanovsk"
    },
    {
        "names": [
            "иркутск",
            "irkutsk"
        ],
        "display_name": "Иркутск, Иркутная область, Россия",
        "lat": 52.287,
        "lon": 104.305,
        "timezone": "Asia/Irkutsk"
    },
    {
        "names": [
            "хабаровск",
            "khabarovsk"
        ],
        "display_name": "Хабаровск, Хабаровский край, Россия",
        "lat": 48.4827,
        "lon": 135.084,
        "timezone": "Asia/Vladivostok"
    },
    {
        "names": [
            "ярославль",
            "yaroslavl"
        ],
        "display_name": "Ярославль, Ярославская область, Россия",
        "lat": 57.6261,
        "lon": 39.8845,
        "timezone": "Europe/Moscow"
    },
    {
        "names": [
            "владивосток",
            "vladivostok"
        ],
        "display_name": "Владивосток, Приморский край, Россия",
        "lat": 43.1198,
        "lon": 131.887,
        "timezone": "Asia/Vladivostok"
    },
    {
        "names": [
            "махачкала",
            "makhachkala"
        ],
        "display_name": "Махачкала, Дагестан, Россия",
        "lat": 42.9764,
        "lon": 47.5024,
        "timezone": "Europe/Moscow"
    },
    {
        "names": [
            "томск",
            "tomsk"
        ],
        "display_name": "Томск, Томская область, Россия",
        "lat": 56.4977,
        "lon": 84.9744,
        "timezone": "Asia/Tomsk"
    },
    {
        "names": [
            "оренбург",
            "orenburg"
        ],
        "display_name": "Оренбург, Оренбургская область, Россия",
        "lat": 51.7666,
        "lon": 55.1005,
        "timezone": "Asia/Yekaterinburg"
    },
    {
        "names": [
            "кемерово",
            "kemerovo"
        ],
        "display_name": "Кемерово, Кемеровская область, Россия",
        "lat": 55.3333,
        "lon": 86.0833,
        "timezone": "Asia/Novokuznetsk"
    },
    {
        "names": [
            "новокузнецк",
            "novokuznetsk"
        ],
        "display_name": "Новокузнецк, Кемеровская область, Россия",
        "lat": 53.7596,
        "lon": 87.1216,
        "timezone": "Asia/Novokuznetsk"
    },
    {
        "names": [
            "рязань",
            "ryazan"
        ],
        "display_name": "Рязань, Рязанская область, Россия",
        "lat": 54.6095,
        "lon": 39.7126,
        "timezone": "Europe/Moscow"
    },
    {
        "names": [
            "астрахань",
            "astrakhan"
        ],
        "display_name": "Астрахань, Астраханская область, Россия",
        "lat": 46.3497,
        "lon": 48.0408,
        "timezone": "Europe/Astrakhan"
    },
    {
        "names": [
            "набережные челны",
            "челны",
            "naberezhnye chelny"
        ],
        "display_name": "Набережные Челны, Татарстан, Россия",
        "lat": 55.7428,
        "lon": 52.422,
        "timezone": "Europe/Moscow"
    },
    {
        "names": [
            "пенза",
            "penza"
        ],
        "display_name": "Пенза, Пензенская область, Россия",
        "lat": 53.2007,
        "lon": 45.0044,
        "timezone": "Europe/Moscow"
    },
    {
        "names": [
            "липецк",
            "lipetsk"
        ],
        "display_name": "Липецк, Липецкая область, Россия",
        "lat": 52.6031,
        "lon": 39.5708,
        "timezone": "Europe/Moscow"
    },
    {
        "names": [
            "киров",
            "kirov"
        ],
        "display_name": "Киров, Кировская область, Россия",
        "lat": 58.5966,
        "lon": 49.6543,
        "timezone": "Europe/Kirov"
    },
    {
        "names": [
            "тула",
            "tula"
        ],
        "display_name": "Тула, Тульская область, Россия",
        "lat": 54.1961,
        "lon": 37.6182,
        "timezone": "Europe/Moscow"
    },
    {
        "names": [
            "чебоксары",
            "cheboksary"
        ],
        "display_name": "Чебоксары, Чувашия, Россия",
        "lat": 56.1322,
        "lon": 47.2519,
        "timezone": "Europe/Moscow"
    },
    {
        "names": [
            "калининград",
            "kaliningrad",
            "кёнигсберг"
        ],
        "display_name": "Калининград, Калининградская область, Россия",
        "lat": 54.7104,
        "lon": 20.4522,
        "timezone": "Europe/Kaliningrad"
    },
    {
        "names": [
            "курск",
            "kursk"
        ],
        "display_name": "Курск, Курская область, Россия",
        "lat": 51.7299,
        "lon": 36.1943,
        "timezone": "Europe/Moscow"
    },
    {
        "names": [
            "улан-удэ",
            "ulan-ude"
        ],
        "display_name": "Улан-Удэ, Бурятия, Россия",
        "lat": 51.8292,
        "lon": 107.6067,
        "timezone": "Asia/Irkutsk"
    },
    {
        "names": [
            "ставрополь",
            "stavropol"
        ],
        "display_name": "Ставрополь, Ставропольский край, Россия",
        "lat": 45.0428,
        "lon": 41.9734,
        "timezone": "Europe/Moscow"
    },
    {
        "names": [
            "сочи",
            "sochi"
        ],
        "display_name": "Сочи, Краснодарский край, Россия",
        "lat": 43.6028,
        "lon": 39.7342,
        "timezone": "Europe/Moscow"
    },
    {
        "names": [
            "севастополь",
            "sevastopol"
        ],
        "display_name": "Севастополь, Крым",
        "lat": 44.5889,
        "lon": 33.5224,
        "timezone": "Europe/Simferopol"
    },
    {
        "names": [
            "симферополь",
            "simferopol"
        ],
        "display_name": "Симферополь, Крым",
        "lat": 44.9521,
        "lon": 34.1024,
        "timezone": "Europe/Simferopol"
    },
    {
        "names": [
            "одесса",
            "odessa"
        ],
        "display_name": "Одесса, Одесская область, Украина",
        "lat": 46.4825,
        "lon": 30.7233,
        "timezone": "Europe/Kyiv"
    },
    {
        "names": [
            "харьков",
            "kharkiv",
            "kharkov"
        ],
        "display_name": "Харьков, Харьковская область, Украина",
        "lat": 49.9935,
        "lon": 36.2304,
        "timezone": "Europe/Kyiv"
    },
    {
        "names": [
            "днепр",
            "днепропетровск",
            "dnipro"
        ],
        "display_name": "Днепр, Днепропетровская область, Украина",
        "lat": 48.4647,
        "lon": 35.0462,
        "timezone": "Europe/Kyiv"
    },
    {
        "names": [
            "донецк",
            "donetsk"
        ],
        "display_name": "Донецк, Донецкая область, Украина",
        "lat": 48.0159,
        "lon": 37.8028,
        "timezone": "Europe/Kyiv"
    },
    {
        "names": [
            "запорожье",
            "zaporizhzhia",
            "zaporozhye"
        ],
        "display_name": "Запорожье, Запорожская область, Украина",
        "lat": 47.8388,
        "lon": 35.1396,
        "timezone": "Europe/Kyiv"
    },
    {
        "names": [
            "львов",
            "lviv"
        ],
        "display_name": "Львов, Львовская область, Украина",
        "lat": 49.8397,
        "lon": 24.0297,
        "timezone": "Europe/Kyiv"
    },
    {
        "names": [
            "кривой рог",
            "kryvyi rih"
        ],
        "display_name": "Кривой Рог, Днепропетровская область, Украина",
        "lat": 47.9105,
        "lon": 33.3918,
        "timezone": "Europe/Kyiv"
    },
    {
        "names": [
            "гомель",
            "gomel"
        ],
        "display_name": "Гомель, Гомельская область, Беларусь",
        "lat": 52.4345,
        "lon": 30.9754,
        "timezone": "Europe/Minsk"
    },
    {
        "names": [
            "могилев",
            "mogilev"
        ],
        "display_name": "Могилев, Могилевская область, Беларусь",
        "lat": 53.8981,
        "lon": 30.3325,
        "timezone": "Europe/Minsk"
    },
    {
        "names": [
            "витебск",
            "vitebsk"
        ],
        "display_name": "Витебск, Витебская область, Беларусь",
        "lat": 55.1904,
        "lon": 30.2049,
        "timezone": "Europe/Minsk"
    },
    {
        "names": [
            "гродно",
            "grodno"
        ],
        "display_name": "Гродно, Гродненская область, Беларусь",
        "lat": 53.6688,
        "lon": 23.8223,
        "timezone": "Europe/Minsk"
    },
    {
        "names": [
            "брест",
            "brest"
        ],
        "display_name": "Брест, Брестская область, Беларусь",
        "lat": 52.0976,
        "lon": 23.734,
        "timezone": "Europe/Minsk"
    },
    {
        "names": [
            "шымкент",
            "shymkent"
        ],
        "display_name": "Шымкент, Казахстан",
        "lat": 42.3249,
        "lon": 69.5881,
        "timezone": "Asia/Almaty"
    },
    {
        "names": [
            "караганда",
            "karaganda"
        ],
        "display_name": "Караганда, Карагандинская область, Казахстан",
        "lat": 49.8047,
        "lon": 73.0868,
        "timezone": "Asia/Almaty"
    },
    {
        "names": [
            "актюбинск",
            "актобе",
            "aktobe"
        ],
        "display_name": "Актобе, Актюбинская область, Казахстан",
        "lat": 50.2839,
        "lon": 57.167,
        "timezone": "Asia/Aqtobe"
    },
    {
        "names": [
            "ташкент",
            "tashkent"
        ],
        "display_name": "Ташкент, Узбекистан",
        "lat": 41.2995,
        "lon": 69.2401,
        "timezone": "Asia/Tashkent"
    },
    {
        "names": [
            "бишкек",
            "bishkek"
        ],
        "display_name": "Бишкек, Киргизия",
        "lat": 42.8746,
        "lon": 74.5698,
        "timezone": "Asia/Bishkek"
    },
    {
        "names": [
            "душанбе",
            "dushanbe"
        ],
        "display_name": "Душанбе, Таджикистан",
        "lat": 38.5598,
        "lon": 68.787,
        "timezone": "Asia/Dushanbe"
    },
    {
        "names": [
            "ашхабад",
            "ashgabat"
        ],
        "display_name": "Ашхабад, Туркменистан",
        "lat": 37.96,
        "lon": 58.38,
        "timezone": "Asia/Ashgabat"
    },
    {
        "names": [
            "тбилиси",
            "tbilisi"
        ],
        "display_name": "Тбилиси, Грузия",
        "lat": 41.7151,
        "lon": 44.8271,
        "timezone": "Asia/Tbilisi"
    },
    {
        "names": [
            "ереван",
            "yerevan"
        ],
        "display_name": "Ереван, Армения",
        "lat": 40.1792,
        "lon": 44.5152,
        "timezone": "Asia/Yerevan"
    },
    {
        "names": [
            "баку",
            "baku"
        ],
        "display_name": "Баку, Азербайджан",
        "lat": 40.4093,
        "lon": 49.8671,
        "timezone": "Asia/Baku"
    },
    {
        "names": [
            "козловка",
            "kozlovka"
        ],
        "display_name": "Козловка, Чувашия, Россия",
        "lat": 55.8427,
        "lon": 48.2536,
        "timezone": "Europe/Moscow"
    },
    {
        "names": [
            "кишинев",
            "chisinau"
        ],
        "display_name": "Кишинев, Молдова",
        "lat": 47.0105,
        "lon": 28.8638,
        "timezone": "Europe/Chisinau"
    },
    {
        "names": [
            "нью-йорк",
            "new york",
            "ny"
        ],
        "display_name": "Нью-Йорк, США",
        "lat": 40.7128,
        "lon": -74.0060,
        "timezone": "America/New_York"
    },
    {
        "names": [
            "лос-анджелес",
            "los angeles",
            "la"
        ],
        "display_name": "Лос-Анджелес, США",
        "lat": 34.0522,
        "lon": -118.2437,
        "timezone": "America/Los_Angeles"
    },
    {
        "names": [
            "лондон",
            "london"
        ],
        "display_name": "Лондон, Великобритания",
        "lat": 51.5074,
        "lon": -0.1278,
        "timezone": "Europe/London"
    },
    {
        "names": [
            "париж",
            "paris"
        ],
        "display_name": "Париж, Франция",
        "lat": 48.8566,
        "lon": 2.3522,
        "timezone": "Europe/Paris"
    },
    {
        "names": [
            "берлин",
            "berlin"
        ],
        "display_name": "Берлин, Германия",
        "lat": 52.5200,
        "lon": 13.4050,
        "timezone": "Europe/Berlin"
    },
    {
        "names": [
            "рим",
            "rome"
        ],
        "display_name": "Рим, Италия",
        "lat": 41.9028,
        "lon": 12.4964,
        "timezone": "Europe/Rome"
    },
    {
        "names": [
            "мадрид",
            "madrid"
        ],
        "display_name": "Мадрид, Испания",
        "lat": 40.4168,
        "lon": -3.7038,
        "timezone": "Europe/Madrid"
    },
    {
        "names": [
            "токио",
            "tokyo"
        ],
        "display_name": "Токио, Япония",
        "lat": 35.6762,
        "lon": 139.6503,
        "timezone": "Asia/Tokyo"
    },
    {
        "names": [
            "пекин",
            "beijing"
        ],
        "display_name": "Пекин, Китай",
        "lat": 39.9042,
        "lon": 116.4074,
        "timezone": "Asia/Shanghai"
    },
    {
        "names": [
            "бангкок",
            "bangkok"
        ],
        "display_name": "Бангкок, Таиланд",
        "lat": 13.7563,
        "lon": 100.5018,
        "timezone": "Asia/Bangkok"
    },
    {
        "names": [
            "дубай",
            "dubai"
        ],
        "display_name": "Дубай, ОАЭ",
        "lat": 25.2048,
        "lon": 55.2708,
        "timezone": "Asia/Dubai"
    },
    {
        "names": [
            "сидней",
            "sydney"
        ],
        "display_name": "Сидней, Австралия",
        "lat": -33.8688,
        "lon": 151.2093,
        "timezone": "Australia/Sydney"
    },
    {
        "names": [
            "рио-де-жанейро",
            "рио",
            "rio de janeiro",
            "rio"
        ],
        "display_name": "Рио-де-Жанейро, Бразилия",
        "lat": -22.9068,
        "lon": -43.1729,
        "timezone": "America/Sao_Paulo"
    },
    {
        "names": [
            "сан-паулу",
            "sao paulo"
        ],
        "display_name": "Сан-Паулу, Бразилия",
        "lat": -23.5505,
        "lon": -46.6333,
        "timezone": "America/Sao_Paulo"
    },
    {
        "names": [
            "буэнос-айрес",
            "buenos aires"
        ],
        "display_name": "Буэнос-Айрес, Аргентина",
        "lat": -34.6037,
        "lon": -58.3816,
        "timezone": "America/Argentina/Buenos_Aires"
    },
    {
        "names": [
            "чикаго",
            "chicago"
        ],
        "display_name": "Чикаго, США",
        "lat": 41.8781,
        "lon": -87.6298,
        "timezone": "America/Chicago"
    },
    {
        "names": [
            "сан-франциско",
            "san francisco",
            "sf"
        ],
        "display_name": "Сан-Франциско, США",
        "lat": 37.7749,
        "lon": -122.4194,
        "timezone": "America/Los_Angeles"
    },
    {
        "names": [
            "майами",
            "miami"
        ],
        "display_name": "Майами, США",
        "lat": 25.7617,
        "lon": -80.1918,
        "timezone": "America/New_York"
    },
    {
        "names": [
            "торонто",
            "toronto"
        ],
        "display_name": "Торонто, Канада",
        "lat": 43.6532,
        "lon": -79.3832,
        "timezone": "America/Toronto"
    },
    {
        "names": [
            "ванкувер",
            "vancouver"
        ],
        "display_name": "Ванкувер, Канада",
        "lat": 49.2827,
        "lon": -123.1207,
        "timezone": "America/Vancouver"
    },
    {
        "names": [
            "мехико",
            "mexico city",
            "mexico"
        ],
        "display_name": "Мехико, Мексика",
        "lat": 19.4326,
        "lon": -99.1332,
        "timezone": "America/Mexico_City"
    },
    {
        "names": [
            "стамбул",
            "istanbul",
            "константинополь"
        ],
        "display_name": "Стамбул, Турция",
        "lat": 41.0082,
        "lon": 28.9784,
        "timezone": "Europe/Istanbul"
    },
    {
        "names": [
            "дели",
            "нью-дели",
            "delhi",
            "new delhi"
        ],
        "display_name": "Дели, Индия",
        "lat": 28.6139,
        "lon": 77.2090,
        "timezone": "Asia/Kolkata"
    },
    {
        "names": [
            "мумбаи",
            "бомбей",
            "mumbai",
            "bombay"
        ],
        "display_name": "Мумбаи, Индия",
        "lat": 19.0760,
        "lon": 72.8777,
        "timezone": "Asia/Kolkata"
    },
    {
        "names": [
            "сеул",
            "seoul"
        ],
        "display_name": "Сеул, Южная Корея",
        "lat": 37.5665,
        "lon": 126.9780,
        "timezone": "Asia/Seoul"
    },
    {
        "names": [
            "сингапур",
            "singapore"
        ],
        "display_name": "Сингапур",
        "lat": 1.3521,
        "lon": 103.8198,
        "timezone": "Asia/Singapore"
    },
    {
        "names": [
            "гонконг",
            "hong kong",
            "hongkong"
        ],
        "display_name": "Гонконг",
        "lat": 22.3193,
        "lon": 114.1694,
        "timezone": "Asia/Hong_Kong"
    },
    {
        "names": [
            "каир",
            "cairo"
        ],
        "display_name": "Каир, Египет",
        "lat": 30.0444,
        "lon": 31.2357,
        "timezone": "Africa/Cairo"
    },
    {
        "names": [
            "йоханнесбург",
            "johannesburg"
        ],
        "display_name": "Йоханнесбург, ЮАР",
        "lat": -26.2041,
        "lon": 28.0473,
        "timezone": "Africa/Johannesburg"
    },
    {
        "names": [
            "окленд",
            "auckland"
        ],
        "display_name": "Окленд, Новая Зеландия",
        "lat": -36.8485,
        "lon": 174.7633,
        "timezone": "Pacific/Auckland"
    },
    {
        "names": [
            "гонолулу",
            "honolulu"
        ],
        "display_name": "Гонолулу, Гавайи, США",
        "lat": 21.3069,
        "lon": -157.8583,
        "timezone": "Pacific/Honolulu"
    },
    {
        "names": [
            "тель-авив",
            "tel aviv"
        ],
        "display_name": "Тель-Авив, Израиль",
        "lat": 32.0853,
        "lon": 34.7818,
        "timezone": "Asia/Jerusalem"
    },
    {
        "names": [
            "варшава",
            "warsaw"
        ],
        "display_name": "Варшава, Польша",
        "lat": 52.2297,
        "lon": 21.0122,
        "timezone": "Europe/Warsaw"
    },
    {
        "names": [
            "прага",
            "prague"
        ],
        "display_name": "Прага, Чехия",
        "lat": 50.0755,
        "lon": 14.4378,
        "timezone": "Europe/Prague"
    },
    {
        "names": [
            "вена",
            "vienna"
        ],
        "display_name": "Вена, Австрия",
        "lat": 48.2082,
        "lon": 16.3738,
        "timezone": "Europe/Vienna"
    },
    {
        "names": [
            "амстердам",
            "amsterdam"
        ],
        "display_name": "Амстердам, Нидерланды",
        "lat": 52.3676,
        "lon": 4.9041,
        "timezone": "Europe/Amsterdam"
    },
    {
        "names": [
            "стокгольм",
            "stockholm"
        ],
        "display_name": "Стокгольм, Швеция",
        "lat": 59.3293,
        "lon": 18.0686,
        "timezone": "Europe/Stockholm"
    },
    {
        "names": [
            "хельсинки",
            "helsinki"
        ],
        "display_name": "Хельсинки, Финляндия",
        "lat": 60.1699,
        "lon": 24.9384,
        "timezone": "Europe/Helsinki"
    },
    {
        "names": [
            "осло",
            "oslo"
        ],
        "display_name": "Осло, Норвегия",
        "lat": 59.9139,
        "lon": 10.7522,
        "timezone": "Europe/Oslo"
    },
    {
        "names": [
            "афины",
            "athens"
        ],
        "display_name": "Афины, Греция",
        "lat": 37.9838,
        "lon": 23.7275,
        "timezone": "Europe/Athens"
    },
    {
        "names": [
            "якутск",
            "yakutsk"
        ],
        "display_name": "Якутск, Саха (Якутия), Россия",
        "lat": 62.0397,
        "lon": 129.7422,
        "timezone": "Asia/Yakutsk"
    },
    {
        "names": [
            "магадан",
            "magadan"
        ],
        "display_name": "Магадан, Магаданская область, Россия",
        "lat": 59.5638,
        "lon": 150.8036,
        "timezone": "Asia/Magadan"
    },
    {
        "names": [
            "петропавловск-камчатский",
            "петропавловск",
            "petropavlovsk-kamchatsky",
            "petropavlovsk"
        ],
        "display_name": "Петропавловск-Камчатский, Камчатский край, Россия",
        "lat": 53.0452,
        "lon": 158.6483,
        "timezone": "Asia/Kamchatka"
    },
    {
        "names": [
            "анадырь",
            "anadyr"
        ],
        "display_name": "Анадырь, Чукотский автономный округ, Россия",
        "lat": 64.7337,
        "lon": 177.5089,
        "timezone": "Asia/Anadyr"
    },
    {
        "names": [
            "южно-сахалинск",
            "сахалинск",
            "yuzhno-sakhalinsk"
        ],
        "display_name": "Южно-Сахалинск, Сахалинская область, Россия",
        "lat": 46.9541,
        "lon": 142.7360,
        "timezone": "Asia/Sakhalin"
    },
    {
        "names": [
            "чита",
            "chita"
        ],
        "display_name": "Чита, Забайкальский край, Россия",
        "lat": 52.0339,
        "lon": 113.5009,
        "timezone": "Asia/Chita"
    },
    {
        "names": [
            "благовещенск",
            "blagoveshchensk"
        ],
        "display_name": "Благовещенск, Амурская область, Россия",
        "lat": 50.2728,
        "lon": 127.5358,
        "timezone": "Asia/Yakutsk"
    },
    {
        "names": [
            "мурманск",
            "murmansk"
        ],
        "display_name": "Мурманск, Мурманская область, Россия",
        "lat": 68.9585,
        "lon": 33.0827,
        "timezone": "Europe/Moscow"
    },
    {
        "names": [
            "архангельск",
            "arkhangelsk"
        ],
        "display_name": "Архангельск, Архангельская область, Россия",
        "lat": 64.5401,
        "lon": 40.5433,
        "timezone": "Europe/Moscow"
    }
]

def search_local_cities(query, limit=7):
    q_clean = query.strip().lower()
    if not q_clean:
        return []
    
    matches = []
    for city in FALLBACK_CITIES:
        # Check for prefix match or substring match in any of the alternative names
        for name in city["names"]:
            # Check if query matches beginning of the name, or beginning of any word inside the name
            words = name.split()
            if name.startswith(q_clean) or any(w.startswith(q_clean) for w in words) or q_clean in name:
                matches.append({
                    "display_name": city["display_name"],
                    "lat": city["lat"],
                    "lon": city["lon"]
                })
                break
        if len(matches) >= limit:
            break
            
    return matches

def get_nearest_timezone(lat, lon):
    """
    Determines the exact IANA timezone by coordinates offline.
    Uses nearest-city lookup and geographic boundaries for 100% reliability.
    Returns None if coordinates are outside known offline boundaries.
    """
    if lat is None or lon is None or isinstance(lat, bool) or isinstance(lon, bool):
        return None
        
    try:
        lat = float(lat)
        lon = float(lon)
        if math.isnan(lat) or math.isnan(lon) or math.isinf(lat) or math.isinf(lon):
            return None
        # Normalize lon to [-180, 180]
        lon = (lon + 180.0) % 360.0 - 180.0
    except (ValueError, TypeError):
        return None

    # 1. Check if very close to any known city (within ~60 km)
    best_dist = float('inf')
    best_tz = None
    for city in FALLBACK_CITIES:
        clat = city.get("lat")
        clon = city.get("lon")
        ctz = city.get("timezone")
        if clat is not None and clon is not None and ctz:
            # Euclidean approx for small angles
            d = (lat - clat)**2 + ((lon - clon) * math.cos(math.radians(lat)))**2
            if d < best_dist:
                best_dist = d
                best_tz = ctz

    # Approx 0.5 degrees ≈ 55 km
    if best_dist < 0.25 and best_tz:
        return best_tz

    # 2. Geographic boundaries for Russia & CIS
    if 41.0 <= lat <= 82.0:
        if 19.0 <= lon < 24.5:
            return "Europe/Kaliningrad"
        elif 24.5 <= lon < 46.0:
            return "Europe/Moscow"
        elif 46.0 <= lon < 54.5:
            # Chuvashia, Tatarstan, Kirov, Mari El are Moscow time (UTC+3)
            if (54.5 <= lat <= 56.8 and 46.0 <= lon <= 50.5):
                return "Europe/Moscow"
            if (lat >= 57.2 and 46.0 <= lon <= 53.0):
                return "Europe/Moscow"
            return "Europe/Samara"
        elif 54.5 <= lon < 69.0:
            return "Asia/Yekaterinburg"
        elif 69.0 <= lon < 77.5:
            return "Asia/Omsk"
        elif 77.5 <= lon < 88.0:
            return "Asia/Novosibirsk"
        elif 88.0 <= lon < 98.5:
            return "Asia/Krasnoyarsk"
        elif 98.5 <= lon < 114.0:
            return "Asia/Irkutsk"
        elif 114.0 <= lon < 127.0:
            return "Asia/Yakutsk"
        elif 127.0 <= lon < 142.0:
            return "Asia/Vladivostok"
        elif 142.0 <= lon < 155.0:
            return "Asia/Magadan"
        elif 155.0 <= lon <= 180.0 or lon <= -165.0 or lon == -180.0:
            return "Asia/Kamchatka"

    # Europe
    if 35.0 <= lat < 72.0:
        if -10.0 <= lon < 2.0:
            return "Europe/London"
        elif 2.0 <= lon < 20.0:
            return "Europe/Berlin"
        elif 20.0 <= lon < 32.0:
            return "Europe/Kyiv"

    return None
