<?php

//GENERIC FUNCTIONS ---------------------------------------------------------------------------------------------------------------

function makeCURLRequest($opts){
	$ch = curl_init();
	curl_setopt_array($ch, $opts);
	$response = curl_exec($ch);
	if(!$response){
	    die('Error: "' . curl_error($ch) . '" - Code: ' . curl_errno($ch));
	}
	curl_close($ch);
	return $response;
}

//GOG FUNCTIONS -------------------------------------------------------------------------------------------------------------------

function makeGOGRequest($url){
	
	$headers = array(
		'accept:text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
		'accept-language:en-US,en;q=0.8',
		'cache-control:no-cache',
		'pragma:no-cache',
		'user-agent:Mozilla/5.0 (Windows NT 6.3; WOW64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/41.0.2272.76 Safari/537.36',
	);
	
	$opts = array(
	    CURLOPT_RETURNTRANSFER => 1,
	    CURLOPT_URL => $url,
	    CURLOPT_COOKIE => 'Origin=80; uqid=zQ0rWwIth0CIbNWA61SJDzRBAb6BxdTjMYLLtskYrrh5gLTfqmIP4DWEs51qA1bQC1eHAnhkCZG%252BtUJjjWtgK6uYBewucsWRU1GIdumFo28%253D; cart_token=87b8a0ebd92abe49; gog_lc=US_USD_en; gog-al=WWb8OMdxNnWThSM6uCHU0Zz78_7UPOz3pVaGOpSP2BP6CSZs1XJN8kSrGBGDpm8li5EGU98PVAhdOh081_ioLgdUn9YPo7c2_aRZAy7yrStBh2_GCB8_LxiXbQZztAjG; _ga=GA1.2.1286008964.1353724899; __utma=95732803.1286008964.1353724899.1425714674.1425775815.9; __utmc=95732803; __utmz=95732803.1425711081.7.1.utmcsr=(direct)|utmccn=(direct)|utmcmd=(none); gog_us=gp7l2j8eafmq75hdj1nclhg333; gtw3lc=wAAqXAUriEqNPtKCtgPUD8cC9DyBPznbK0V40dThUeZy%252BCjRLPYnn6VXKjd5UHSI; sessions_gog_com=yAkqXQYuhxWKPNbQ5QaPD%252BZvjZEMEsSsI6%252Bh%252FZghhySm7GyPNxEbCEo4GgZHJ1eM2w8OpRNXsULIwyZtlV4Hpi842E9OZgo0f6MsQKXSQr47KmA2KpntWWAxbZDdUVJ7xfIigBTmc9mmFWlFcrtP45Cf%252BMqPBgOE575kSAcCfoOlvVR%252FIiRTSZKxV8Ayl1V9',
	    CURLOPT_SSL_VERIFYPEER => false,
	    CURLOPT_HTTPHEADER => $headers,
	);
	
	return makeCURLRequest($opts);
}

function getAllGOGGameIds(){
	$gameListData = array();
	$page = 2;
	
	$hasMoreResults = true;
	
	while($hasMoreResults){
		$url = getGOGGameListURL($page);
		$response = makeGOGRequest($url);
		$responseArray = json_decode($response,true);
		
		if( !array_key_exists("html", $responseArray) || trim($responseArray["html"]) == "" ){
			$hasMoreResults = false;
		}else{
			$htmlToParse = $responseArray["html"];
			$result = preg_match_all("/game_li_([0-9]*)/", $htmlToParse, $matches);
			$gameListData = array_merge($gameListData, $matches[1]);
						
			$page++;
		}
	}
	
	return $gameListData;
	
}

function getGOGGameListURL($page_no){
	return "https://www.gog.com/account/ajax?a=gamesListMore&p=" . $page_no . "&s=title&q=&t=1425712827882&h=0";
}

function getGOGGameDetailURL($gameId){
	return "https://www.gog.com/account/ajax?a=gamesListDetails&g=" . $gameId;
}

function getGOGData(){
	$gameData = array();
	$gameIds = getAllGOGGameIds();
	
	foreach($gameIds as $gameId){
		$thisGameData = array("id" => $gameId);
		$detailUrl = getGOGGameDetailURL($gameId);
		$gameDetails = makeGOGRequest($detailUrl);
		$responseArray = json_decode($gameDetails,true);

		$htmlToParse = $responseArray["details"]["html"];

		if( strpos($htmlToParse, "list-downloads-win") !== false){
			$thisGameData["windows"]=true;
		}else{
			$thisGameData["windows"]=false;
		}

		if( strpos($htmlToParse, "list-downloads-mac") !== false){
			$thisGameData["mac"]=true;
		}else{
			$thisGameData["mac"]=false;
		}
		
		if( strpos($htmlToParse, "list-downloads-linux") !== false){
			$thisGameData["linux"]=true;
		}else{
			$thisGameData["linux"]=false;
		}
		
		$hasMatches = preg_match('/<h2>\s+<a href="http[^"]+">([^<]+)<\/a>/', $htmlToParse, $matches);
		if($hasMatches == 1){
			$thisGameData["name"] = trim($matches[1]);
		}else{
			preg_match('/<h2>([^<]+)<\/h2>/', $htmlToParse, $matches);
			$thisGameData["name"] = trim($matches[1]);
		}

		array_push($gameData, $thisGameData);
	}

	return $gameData;
}

//STEAM FUNCTIONS ---------------------------------------------------------------------------------------------------------------

function getSteamGameListURL(){
	return "http://api.steampowered.com/IPlayerService/GetOwnedGames/v0001/?key=95F6CEF40E22F8140568E5EF5D010744&steamid=76561197984509656&format=json&include_appinfo=1";
}

function getSteamGameDetailURL($gameId){
	return "http://store.steampowered.com/api/appdetails/?appids=" . $gameId;
}

function makeSteamRequest($url){
	$opts = array(
	    CURLOPT_RETURNTRANSFER => 1,
	    CURLOPT_URL => $url,
	);
	
	return makeCURLRequest($opts);
}

function getAllSteamGameIds(){
	$response = makeSteamRequest(getSteamGameListURL());
	$responseArray = json_decode($response,true);
	$gameIds = array();
	
	foreach($responseArray["response"]["games"] as $gameData){
		array_push($gameIds, $gameData["appid"]);
	}
	
	return $gameIds;
}

function getSteamData(){
	$steamGameIds = getAllSteamGameIds();
	$steamGameData = array();
	
	$i=0;
	$start=300;
	$stop=349;
	foreach($steamGameIds as $gameId){
		$thisGameData = array();
		if($i >= $start && $i < $stop){
			$response = makeSteamRequest(getSteamGameDetailURL($gameId));
			$responseArray = json_decode($response,true);
			
			if(array_key_exists("data", $responseArray[$gameId])){
				$platformData = $responseArray[$gameId]["data"]["platforms"];
				$name = $responseArray[$gameId]["data"]["name"];
				
				$thisGameData["id"] = $gameId;
				$thisGameData["name"] = $name;
				$thisGameData["windows"] = $platformData["windows"];
				$thisGameData["mac"] = $platformData["mac"];
				$thisGameData["linux"] = $platformData["linux"];				
			}else{
				$thisGameData["id"] = $gameId;
				$thisGameData["name"] = "ERROR";
				$thisGameData["windows"] = null;
				$thisGameData["mac"] = null;
				$thisGameData["linux"] = null;	
			}
			
			array_push($steamGameData, $thisGameData);
		}
		$i++;
	}
	
	return $steamGameData;
}

//GOG DATA ---------------------------------------------------------------------------------------------------------------

//$gogData = getGOGData();
//echo json_encode($gogData);
//[{"id":"1207659038","windows":true,"mac":false,"linux":false,"name":"Alan Wake's American Nightmare"},{"id":"1207660053","windows":true,"mac":false,"linux":false,"name":"Aqua Kitty: Milk Mine Defender"},{"id":"1207658829","windows":true,"mac":false,"linux":false,"name":"Arcanum: Of Steamworks and Magick Obscura"},{"id":"1207659156","windows":true,"mac":true,"linux":false,"name":"Avernum: The Complete Saga"},{"id":"1207659097","windows":true,"mac":false,"linux":false,"name":"Back to the Future: The Game"},{"id":"1207659086","windows":true,"mac":false,"linux":false,"name":"Ball, The"},{"id":"1207660124","windows":true,"mac":true,"linux":true,"name":"Battle Worlds: Kronos"},{"id":"1207658695","windows":true,"mac":true,"linux":false,"name":"Beneath a Steel Sky"},{"id":"1207658746","windows":true,"mac":false,"linux":false,"name":"Beyond Good & Evil\u2122"},{"id":"1207658856","windows":true,"mac":false,"linux":false,"name":"Blood: One Unit Whole Blood"},{"id":"1207662943","windows":true,"mac":true,"linux":true,"name":"Broken Age Season Pass"},{"id":"1207659253","windows":true,"mac":true,"linux":true,"name":"Brutal Legend"},{"id":"1207658838","windows":true,"mac":false,"linux":false,"name":"Call to Power 2"},{"id":"1207659070","windows":true,"mac":false,"linux":false,"name":"Chronicles of Riddick: Assault on Dark Athena, The"},{"id":"1207664203","windows":true,"mac":false,"linux":false,"name":"Consortium: Master Edition, The"},{"id":"1207658982","windows":true,"mac":true,"linux":false,"name":"Crusader: No Regret\u2122"},{"id":"1207658933","windows":true,"mac":true,"linux":false,"name":"Crusader: No Remorse\u2122"},{"id":"1207659103","windows":true,"mac":true,"linux":true,"name":"Deponia"},{"id":"1207659263","windows":true,"mac":false,"linux":false,"name":"Divinity: Dragon Commander"},{"id":"1207658927","windows":true,"mac":true,"linux":true,"name":"Dragonsphere"},{"id":"1207658730","windows":true,"mac":true,"linux":true,"name":"Duke Nukem 3D Atomic Edition"},{"id":"1207658959","windows":true,"mac":false,"linux":false,"name":"Dungeon Keeper\u2122 2"},{"id":"1207658934","windows":true,"mac":true,"linux":false,"name":"Dungeon Keeper Gold\u2122"},{"id":"1207659194","windows":true,"mac":false,"linux":false,"name":"Eador. Masters of the Broken World"},{"id":"1207658844","windows":true,"mac":false,"linux":false,"name":"Empire Earth 2 Gold Edition"},{"id":"1207658859","windows":true,"mac":false,"linux":false,"name":"Empire Earth 3"},{"id":"1207658777","windows":true,"mac":false,"linux":false,"name":"Empire Earth Gold Edition"},{"id":"1207658775","windows":true,"mac":true,"linux":false,"name":"Evil Genius"},{"id":"1207659200","windows":true,"mac":true,"linux":false,"name":"Evoland"},{"id":"1207664153","windows":true,"mac":true,"linux":false,"name":"FRACT OSC"},{"id":"1207659102","windows":true,"mac":true,"linux":true,"name":"FTL: Advanced Edition"},{"id":"1207659067","windows":true,"mac":true,"linux":false,"name":"Geneforge Saga"},{"id":"1207659843","windows":true,"mac":false,"linux":false,"name":"Giana Sisters: Rise of the Owlverlord"},{"id":"1207666533","windows":true,"mac":true,"linux":true,"name":"Halfway"},{"id":"1207659118","windows":true,"mac":true,"linux":true,"name":"Hotline Miami"},{"id":"1207659593","windows":true,"mac":true,"linux":false,"name":"I Have No Mouth And I Must Scream"},{"id":"1207660673","windows":true,"mac":true,"linux":false,"name":"Jazzpunk"},{"id":"1207658779","windows":true,"mac":false,"linux":false,"name":"Judge Dredd: Dredd vs Death"},{"id":"1207659096","windows":true,"mac":false,"linux":false,"name":"King of Dragon Pass"},{"id":"1207659154","windows":true,"mac":false,"linux":false,"name":"King's Bounty: Crossworlds GOTY"},{"id":"1207659933","windows":true,"mac":true,"linux":true,"name":"Long Live the Queen"},{"id":"1207659128","windows":true,"mac":false,"linux":false,"name":"Lucius"},{"id":"1207658694","windows":true,"mac":true,"linux":false,"name":"Lure of the Temptress"},{"id":"1207658935","windows":true,"mac":true,"linux":false,"name":"Magic Carpet Plus\u2122"},{"id":"1207659236","windows":true,"mac":false,"linux":false,"name":"Magrunner: Dark Pulse"},{"id":"1207666893","windows":true,"mac":false,"linux":false,"name":"Mount & Blade"},{"id":"1207659162","windows":true,"mac":false,"linux":false,"name":"Neverwinter Nights 2 Complete"},{"id":"1207660553","windows":true,"mac":true,"linux":true,"name":"Octodad: Dadliest Catch"},{"id":"1207659255","windows":true,"mac":true,"linux":false,"name":"Penumbra Collection, The"},{"id":"1207659046","windows":true,"mac":false,"linux":false,"name":"Pharaoh + Cleopatra"},{"id":"1207660104","windows":true,"mac":true,"linux":true,"name":"PixelJunk Shooter"},{"id":"1207659122","windows":true,"mac":true,"linux":false,"name":"Puddle"},{"id":"1207660613","windows":true,"mac":false,"linux":false,"name":"Red Faction 2"},{"id":"1207659049","windows":true,"mac":true,"linux":false,"name":"Retro City Rampage DX"},{"id":"1207659244","windows":true,"mac":false,"linux":false,"name":"Rise of the Triad (2013)"},{"id":"1207663153","windows":true,"mac":false,"linux":false,"name":"Risen"},{"id":"1207663193","windows":true,"mac":false,"linux":false,"name":"Risen 2: Dark Waters"},{"id":"1207658945","windows":true,"mac":false,"linux":false,"name":"RollerCoaster Tycoon: Deluxe"},{"id":"1207659058","windows":true,"mac":false,"linux":false,"name":"S2: Silent Storm Gold Edition"},{"id":"1207660413","windows":true,"mac":true,"linux":true,"name":"Shadowrun Returns"},{"id":"1207658936","windows":true,"mac":true,"linux":false,"name":"Sid Meier's Alpha Centauri\u2122 Planetary Pack"},{"id":"1207658969","windows":true,"mac":true,"linux":false,"name":"SimCity\u2122 2000 Special Edition"},{"id":"1207664303","windows":true,"mac":true,"linux":true,"name":"Sir, You Are Being Hunted"},{"id":"1207659873","windows":true,"mac":true,"linux":false,"name":"Smugglers V"},{"id":"1207659018","windows":true,"mac":true,"linux":true,"name":"Spacechem"},{"id":"1207658719","windows":true,"mac":false,"linux":false,"name":"Spellforce Platinum"},{"id":"1207666403","windows":true,"mac":false,"linux":false,"name":"STAR WARS\u00ae: TIE Fighter (1994)"},{"id":"1207666413","windows":true,"mac":false,"linux":false,"name":"STAR WARS\u00ae: TIE Fighter (1998)"},{"id":"1207659100","windows":true,"mac":false,"linux":false,"name":"Startopia"},{"id":"1207659007","windows":true,"mac":false,"linux":false,"name":"Still Life 2"},{"id":"1207659161","windows":true,"mac":true,"linux":false,"name":" Strike Suit Zero"},{"id":"1207658713","windows":true,"mac":true,"linux":false,"name":"Stronghold Crusader HD"},{"id":"1207659079","windows":true,"mac":false,"linux":false,"name":"Symphony"},{"id":"1207659172","windows":true,"mac":true,"linux":false,"name":"System Shock\u2122 2"},{"id":"1207659523","windows":true,"mac":false,"linux":false,"name":"Tales From Space: Mutant Blobs Attack"},{"id":"1207658753","windows":true,"mac":true,"linux":false,"name":"Teenagent"},{"id":"1207659026","windows":true,"mac":true,"linux":false,"name":"Theme Hospital"},{"id":"1207658901","windows":true,"mac":true,"linux":false,"name":"Tyrian 2000"},{"id":"1207659087","windows":true,"mac":false,"linux":false,"name":"Unmechanical"},{"id":"1207658677","windows":true,"mac":false,"linux":false,"name":"Unreal 2: The Awakening Special Edition"},{"id":"1207658679","windows":true,"mac":false,"linux":false,"name":"Unreal Gold"},{"id":"1207658691","windows":true,"mac":false,"linux":false,"name":"Unreal Tournament 2004 Editor's Choice Edition"},{"id":"1207658692","windows":true,"mac":false,"linux":false,"name":"Unreal Tournament GOTY"},{"id":"1207659171","windows":true,"mac":false,"linux":false,"name":"Zafehouse: Diaries"},{"id":"1207659039","windows":true,"mac":false,"linux":false,"name":"Zeus + Poseidon (Acropolis)"}]

//STEAM DATA ---------------------------------------------------------------------------------------------------------------

//$steamData = getSteamData();
//echo json_encode($steamData);

//[{"id":220,"name":"Half-Life 2","windows":true,"mac":true,"linux":true},{"id":240,"name":"Counter-Strike: Source","windows":true,"mac":true,"linux":true},{"id":280,"name":"Half-Life: Source","windows":true,"mac":true,"linux":true},{"id":320,"name":"Half-Life 2: Deathmatch","windows":true,"mac":true,"linux":true},{"id":340,"name":"Half-Life 2: Lost Coast","windows":true,"mac":true,"linux":true},{"id":360,"name":"Half-Life Deathmatch: Source","windows":true,"mac":true,"linux":true},{"id":4000,"name":"Garry\'s Mod","windows":true,"mac":true,"linux":true},{"id":6100,"name":"Eets","windows":true,"mac":true,"linux":false},{"id":380,"name":"Half-Life 2: Episode One","windows":true,"mac":true,"linux":true},{"id":400,"name":"Portal","windows":true,"mac":true,"linux":true},{"id":420,"name":"Half-Life 2: Episode Two","windows":true,"mac":true,"linux":true},{"id":2700,"name":"RollerCoaster Tycoon\u00ae 3: Platinum","windows":true,"mac":true,"linux":false},{"id":13210,"name":"Unreal Tournament 3 Black","windows":true,"mac":false,"linux":false},{"id":15500,"name":"The Wonderful End of the World","windows":true,"mac":false,"linux":false},{"id":12360,"name":"FlatOut: Ultimate Carnage","windows":true,"mac":false,"linux":false},{"id":19900,"name":"Far Cry\u00ae 2: Fortune\'s Edition","windows":true,"mac":false,"linux":false},{"id":12200,"name":"Bully: Scholarship Edition","windows":true,"mac":false,"linux":false},{"id":9480,"name":"Saints Row 2","windows":true,"mac":false,"linux":false},{"id":16730,"name":"Legendary","windows":true,"mac":false,"linux":false},{"id":12210,"name":"Grand Theft Auto IV","windows":true,"mac":false,"linux":false},{"id":17480,"name":"Command & Conquer: Red Alert 3","windows":true,"mac":false,"linux":false},{"id":10150,"name":"Prototype\u2122","windows":true,"mac":false,"linux":false},{"id":22330,"name":"The Elder Scrolls IV: Oblivion\u00ae Game of the Year Edition","windows":true,"mac":false,"linux":false},{"id":22320,"name":"The Elder Scrolls III: Morrowind\u00ae Game of the Year Edition","windows":true,"mac":false,"linux":false},{"id":6060,"name":"Star Wars Battlefront\u00ae II","windows":true,"mac":false,"linux":false},{"id":6000,"name":"Star Wars Republic Commando\u2122","windows":true,"mac":false,"linux":false},{"id":32370,"name":"Star Wars: Knights of the Old Republic","windows":true,"mac":true,"linux":false},{"id":6010,"name":"Indiana Jones\u00ae and the Fate of Atlantis\u2122 ","windows":true,"mac":true,"linux":false},{"id":6040,"name":"The Dig\u00ae ","windows":true,"mac":true,"linux":false},{"id":32310,"name":"Indiana Jones\u00ae and the Last Crusade\u2122","windows":true,"mac":true,"linux":false},{"id":32340,"name":"LOOM\u2122","windows":true,"mac":true,"linux":false},{"id":20500,"name":"Red Faction Guerrilla Steam Edition","windows":true,"mac":false,"linux":false},{"id":24800,"name":"Command & Conquer: Red Alert 3 - Uprising","windows":true,"mac":false,"linux":false},{"id":24790,"name":"Command & Conquer 3: Tiberium Wars","windows":true,"mac":false,"linux":false},{"id":24810,"name":"Command & Conquer 3: Kane\'s Wrath","windows":true,"mac":false,"linux":false},{"id":32430,"name":"Star Wars The Force Unleashed: Ultimate Sith Edition","windows":true,"mac":true,"linux":false},{"id":22370,"name":"Fallout 3: Game of the Year Edition","windows":true,"mac":false,"linux":false},{"id":24980,"name":"Mass Effect 2","windows":true,"mac":false,"linux":false},{"id":23450,"name":"Grand Ages: Rome","windows":true,"mac":false,"linux":false},{"id":40100,"name":"Supreme Commander 2","windows":true,"mac":false,"linux":false},{"id":48110,"name":"Silent Hunter 5\u00ae: Battle of the Atlantic","windows":true,"mac":false,"linux":false},{"id":8190,"name":"Just Cause 2","windows":true,"mac":false,"linux":false},{"id":35140,"name":"Batman: Arkham Asylum Game of the Year Edition","windows":true,"mac":false,"linux":false},{"id":3900,"name":"Sid Meier\'s Civilization\u00ae IV","windows":true,"mac":true,"linux":false},{"id":3990,"name":"Civilization IV\u00ae: Warlords","windows":true,"mac":true,"linux":false},{"id":8800,"name":"Civilization IV: Beyond the Sword","windows":true,"mac":true,"linux":false},{"id":16810,"name":"Sid Meier\'s Civilization IV: Colonization","windows":true,"mac":true,"linux":false},{"id":34440,"name":"Sid Meier\'s Civilization\u00ae IV","windows":true,"mac":true,"linux":false},{"id":34450,"name":"Civilization IV\u00ae: Warlords","windows":true,"mac":true,"linux":false},{"id":32470,"name":"Star Wars\u00ae Empire at War\u2122: Gold Pack","windows":true,"mac":false,"linux":false},{"id":46440,"name":"Future Wars","windows":true,"mac":false,"linux":false},{"id":24780,"name":"SimCity\u2122 4 Deluxe Edition","windows":true,"mac":true,"linux":false},{"id":48800,"name":"Ship Simulator Extremes","windows":true,"mac":false,"linux":false},{"id":32500,"name":"STAR WARS\u00ae THE FORCE UNLEASHED II","windows":true,"mac":false,"linux":false},{"id":12220,"name":"Grand Theft Auto: Episodes from Liberty City","windows":true,"mac":false,"linux":false},{"id":72200,"name":"Universe Sandbox","windows":true,"mac":false,"linux":false},{"id":40380,"name":"nail\'d","windows":true,"mac":false,"linux":false},{"id":38720,"name":"RUSH","windows":true,"mac":true,"linux":true},{"id":48950,"name":"Greed Corp","windows":true,"mac":false,"linux":false},{"id":16450,"name":"F.E.A.R. 2: Project Origin","windows":true,"mac":false,"linux":false},{"id":21090,"name":"F.E.A.R.","windows":true,"mac":false,"linux":false},{"id":21110,"name":"F.E.A.R.","windows":true,"mac":false,"linux":false},{"id":21120,"name":"F.E.A.R.","windows":true,"mac":false,"linux":false},{"id":4540,"name":"Titan Quest","windows":true,"mac":false,"linux":false},{"id":42910,"name":"Magicka","windows":true,"mac":false,"linux":false},{"id":99810,"name":"Bulletstorm\u2122","windows":true,"mac":false,"linux":false},{"id":15620,"name":"Warhammer\u00ae 40,000\u2122: Dawn of War\u00ae II","windows":true,"mac":false,"linux":false},{"id":20570,"name":"Warhammer\u00ae 40,000: Dawn of War\u00ae II Chaos Rising","windows":true,"mac":false,"linux":false},{"id":56400,"name":"Warhammer 40,000: Dawn of War II: Retribution","windows":true,"mac":false,"linux":false},{"id":620,"name":"Portal 2","windows":true,"mac":true,"linux":true},{"id":34330,"name":"Total War: SHOGUN 2","windows":true,"mac":true,"linux":false},{"id":55100,"name":"Homefront","windows":true,"mac":false,"linux":false},{"id":8200,"name":"Sam & Max 101: Culture Shock","windows":true,"mac":false,"linux":false},{"id":8210,"name":"Sam & Max 102: Situation: Comedy","windows":true,"mac":false,"linux":false},{"id":8220,"name":"Sam & Max 103: The Mole, the Mob and the Meatball","windows":true,"mac":false,"linux":false},{"id":8230,"name":"Sam & Max 104: Abe Lincoln Must Die!","windows":true,"mac":false,"linux":false},{"id":8240,"name":"Sam & Max 105: Reality 2.0","windows":true,"mac":false,"linux":false},{"id":8250,"name":"Sam & Max 106: Bright Side of the Moon","windows":true,"mac":false,"linux":false},{"id":901663,"name":"Sam & Max: Season Two","windows":true,"mac":true,"linux":false},{"id":8260,"name":"Sam & Max 201: Ice Station Santa","windows":true,"mac":true,"linux":false},{"id":8270,"name":"Sam & Max 202: Moai Better Blues","windows":true,"mac":true,"linux":false},{"id":8280,"name":"Sam & Max 203: Night of the Raving Dead","windows":true,"mac":true,"linux":false},{"id":8290,"name":"Sam & Max 204: Chariots of the Dogs","windows":true,"mac":true,"linux":false},{"id":8300,"name":"Sam & Max 205: What\'s New Beelzebub?","windows":true,"mac":true,"linux":false},{"id":901399,"name":"Sam & Max: The Devil\u2019s Playhouse","windows":true,"mac":true,"linux":false},{"id":31220,"name":"Sam & Max 301: The Penal Zone","windows":true,"mac":true,"linux":false},{"id":31230,"name":"Sam & Max 302: The Tomb of Sammun-Mak","windows":true,"mac":true,"linux":false},{"id":31240,"name":"Sam & Max 303: They Stole Max\'s Brain!","windows":true,"mac":true,"linux":false},{"id":31250,"name":"Sam & Max 304: Beyond the Alley of the Dolls","windows":true,"mac":true,"linux":false},{"id":31260,"name":"Sam & Max 305: The City that Dares not Sleep","windows":true,"mac":true,"linux":false},{"id":104200,"name":"BEEP","windows":true,"mac":false,"linux":false},{"id":105600,"name":"Terraria","windows":true,"mac":false,"linux":false},{"id":50620,"name":"Darksiders\u2122","windows":true,"mac":false,"linux":false},{"id":55150,"name":"Warhammer 40,000: Space Marine","windows":true,"mac":false,"linux":false},{"id":104000,"name":"iBomber Defense","windows":true,"mac":true,"linux":false},{"id":57900,"name":"Duke Nukem Forever","windows":true,"mac":true,"linux":false},{"id":97000,"name":"Solar 2","windows":true,"mac":true,"linux":true},{"id":22230,"name":"Rock of Ages","windows":true,"mac":false,"linux":false},{"id":99300,"name":"Renegade Ops","windows":true,"mac":false,"linux":false},{"id":33460,"name":"From Dust","windows":true,"mac":false,"linux":false},{"id":107200,"name":"Space Pirates and Zombies","windows":true,"mac":true,"linux":true},{"id":200550,"name":"Dungeons - The Dark Lord","windows":true,"mac":false,"linux":false},{"id":98600,"name":"Demolition Inc.","windows":true,"mac":true,"linux":false},{"id":8930,"name":"Sid Meier\'s Civilization\u00ae V","windows":true,"mac":true,"linux":true},{"id":55230,"name":"Saints Row: The Third","windows":true,"mac":false,"linux":false},{"id":102600,"name":"Orcs Must Die!","windows":true,"mac":false,"linux":false},{"id":9200,"name":"RAGE","windows":true,"mac":false,"linux":false},{"id":116120,"name":"Lightfish","windows":true,"mac":true,"linux":false},{"id":110800,"name":"L.A. Noire","windows":true,"mac":false,"linux":false},{"id":24010,"name":"Train Simulator 2015","windows":true,"mac":false,"linux":false},{"id":72850,"name":"The Elder Scrolls V: Skyrim","windows":true,"mac":false,"linux":false},{"id":107800,"name":"Rochard","windows":true,"mac":true,"linux":true},{"id":201290,"name":"Sins of a Solar Empire\u00ae: Trinity","windows":true,"mac":false,"linux":false},{"id":41070,"name":"Serious Sam 3: BFE","windows":true,"mac":true,"linux":true},{"id":57400,"name":"Batman: Arkham City","windows":true,"mac":false,"linux":false},{"id":200260,"name":"Batman: Arkham City - Game of the Year Edition","windows":true,"mac":true,"linux":false},{"id":202200,"name":"Galactic Civilizations\u00ae II: Ultimate Edition","windows":true,"mac":false,"linux":false},{"id":202710,"name":"Demigod","windows":true,"mac":false,"linux":false},{"id":2820,"name":"X3: Terran Conflict","windows":true,"mac":true,"linux":true},{"id":201310,"name":"X3: Albion Prelude","windows":true,"mac":true,"linux":true},{"id":203730,"name":"Q.U.B.E.","windows":true,"mac":true,"linux":false},{"id":239430,"name":"Q.U.B.E: Director\'s Cut","windows":true,"mac":false,"linux":false},{"id":29180,"name":"Osmos","windows":true,"mac":true,"linux":true},{"id":38740,"name":"EDGE","windows":true,"mac":true,"linux":true},{"id":91200,"name":"Anomaly: Warzone Earth","windows":true,"mac":true,"linux":true},{"id":22000,"name":"World of Goo","windows":true,"mac":true,"linux":true},{"id":102500,"name":"Kingdoms of Amalur: Reckoning\u2122","windows":true,"mac":false,"linux":false},{"id":38700,"name":"Toki Tori","windows":true,"mac":true,"linux":true},{"id":67370,"name":"The Darkness II","windows":true,"mac":true,"linux":false},{"id":22380,"name":"Fallout: New Vegas","windows":true,"mac":false,"linux":false},{"id":3830,"name":"Psychonauts","windows":true,"mac":true,"linux":true},{"id":115100,"name":"Costume Quest","windows":true,"mac":true,"linux":true},{"id":115110,"name":"Stacking","windows":true,"mac":true,"linux":true},{"id":102850,"name":"Warp","windows":true,"mac":false,"linux":false},{"id":204880,"name":"Sins of a Solar Empire\u00ae: Rebellion","windows":true,"mac":false,"linux":false},{"id":207610,"name":"The Walking Dead","windows":true,"mac":true,"linux":false},{"id":208140,"name":"Endless Space\u00ae - Emperor Edition","windows":true,"mac":true,"linux":false},{"id":211740,"name":"Thief\u2122 II: The Metal Age","windows":true,"mac":false,"linux":false},{"id":108200,"name":"Ticket to Ride","windows":true,"mac":true,"linux":true},{"id":205910,"name":"Tiny and Big: Grandpa\'s Leftovers","windows":true,"mac":true,"linux":true},{"id":107300,"name":"Breath of Death VII","windows":true,"mac":false,"linux":false},{"id":107310,"name":"Cthulhu Saves the World","windows":true,"mac":false,"linux":false},{"id":213030,"name":"Penny Arcade\'s On the Rain-Slick Precipice of Darkness 3","windows":true,"mac":true,"linux":false},{"id":50300,"name":"Spec Ops: The Line","windows":true,"mac":true,"linux":false},{"id":4500,"name":"S.T.A.L.K.E.R.: Shadow of Chernobyl","windows":true,"mac":false,"linux":false},{"id":20510,"name":"S.T.A.L.K.E.R.: Clear Sky","windows":true,"mac":false,"linux":false},{"id":41700,"name":"S.T.A.L.K.E.R.: Call of Pripyat","windows":true,"mac":false,"linux":false},{"id":105400,"name":"Fable III","windows":true,"mac":false,"linux":false},{"id":204030,"name":"Fable - The Lost Chapters","windows":true,"mac":false,"linux":false},{"id":57690,"name":"Tropico 4: Steam Special Edition","windows":true,"mac":true,"linux":false},{"id":17330,"name":"Crysis Warhead\u00ae","windows":true,"mac":false,"linux":false},{"id":17340,"name":"Crysis Warhead\u00ae","windows":true,"mac":false,"linux":false},{"id":108800,"name":"Crysis 2 - Maximum Edition","windows":true,"mac":false,"linux":false},{"id":115320,"name":"Prototype 2","windows":true,"mac":false,"linux":false},{"id":202170,"name":"Sleeping Dogs","windows":true,"mac":false,"linux":false},{"id":214360,"name":"Tower Wars","windows":true,"mac":true,"linux":false},{"id":234740,"name":"Tower Wars Editor","windows":true,"mac":true,"linux":false},{"id":214700,"name":"Thirty Flights of Loving","windows":true,"mac":true,"linux":false},{"id":730,"name":"Counter-Strike: Global Offensive","windows":true,"mac":true,"linux":true},{"id":208580,"name":"STAR WARS\u00ae: Knights of the Old Republic\u2122 II","windows":true,"mac":false,"linux":false},{"id":200710,"name":"Torchlight II","windows":true,"mac":true,"linux":true},{"id":205100,"name":"Dishonored","windows":true,"mac":false,"linux":false},{"id":200510,"name":"XCOM: Enemy Unknown","windows":true,"mac":true,"linux":true},{"id":218410,"name":"Defender\'s Quest: Valley of the Forgotten","windows":true,"mac":true,"linux":true},{"id":220460,"name":"Cargo Commander","windows":true,"mac":true,"linux":true},{"id":221020,"name":"Towns","windows":true,"mac":true,"linux":true},{"id":208480,"name":"Assassin\u2019s Creed\u00ae III","windows":true,"mac":false,"linux":false},{"id":220240,"name":"Far Cry 3","windows":true,"mac":false,"linux":false},{"id":219740,"name":"Don\'t Starve","windows":true,"mac":true,"linux":true},{"id":220780,"name":"Thomas Was Alone","windows":true,"mac":true,"linux":false},{"id":221260,"name":"Little Inferno","windows":true,"mac":true,"linux":true},{"id":203140,"name":"Hitman: Absolution\u2122","windows":true,"mac":true,"linux":false},{"id":205930,"name":"Hitman: Sniper Challenge","windows":true,"mac":true,"linux":false},{"id":201790,"name":"Orcs Must Die! 2","windows":true,"mac":false,"linux":false},{"id":4560,"name":"Company of Heroes","windows":true,"mac":false,"linux":false},{"id":9340,"name":"Company of Heroes: Opposing Fronts","windows":true,"mac":false,"linux":false},{"id":20540,"name":"Company of Heroes: Tales of Valor","windows":true,"mac":false,"linux":false},{"id":43110,"name":"Metro 2033","windows":true,"mac":false,"linux":false},{"id":55110,"name":"Red Faction\u00ae: Armageddon\u2122","windows":true,"mac":false,"linux":false},{"id":228200,"name":"Company of Heroes (New Steam Version)","windows":true,"mac":false,"linux":false},{"id":214510,"name":"LEGO The Lord of the Rings","windows":true,"mac":false,"linux":false},{"id":4570,"name":"Warhammer\u00ae 40,000: Dawn of War\u00ae - Game of the Year Edition","windows":true,"mac":false,"linux":false},{"id":228280,"name":"Baldur\'s Gate: Enhanced Edition","windows":true,"mac":true,"linux":true},{"id":221810,"name":"The Cave","windows":true,"mac":true,"linux":true},{"id":203160,"name":"Tomb Raider","windows":true,"mac":true,"linux":false},{"id":220440,"name":"DmC: Devil May Cry","windows":true,"mac":false,"linux":false},{"id":227300,"name":"Euro Truck Simulator 2","windows":true,"mac":true,"linux":true},{"id":208520,"name":"Omerta - City of Gangsters","windows":true,"mac":true,"linux":false},{"id":219680,"name":"Proteus","windows":true,"mac":true,"linux":true},{"id":219890,"name":"Antichamber","windows":true,"mac":true,"linux":true},{"id":233740,"name":"Organ Trail: Director\'s Cut","windows":true,"mac":true,"linux":true},{"id":227860,"name":"Castle Story","windows":true,"mac":true,"linux":true},{"id":224500,"name":"Gnomoria","windows":true,"mac":false,"linux":false},{"id":227720,"name":"Under the Ocean","windows":true,"mac":false,"linux":false},{"id":230050,"name":"DLC Quest","windows":true,"mac":true,"linux":false},{"id":233450,"name":"Prison Architect","windows":true,"mac":true,"linux":true},{"id":227160,"name":"Kinetic Void","windows":true,"mac":true,"linux":true},{"id":227680,"name":"StarForge","windows":true,"mac":false,"linux":false},{"id":228260,"name":"Fallen Enchantress: Legendary Heroes","windows":true,"mac":false,"linux":false},{"id":208730,"name":"Game of Thrones","windows":true,"mac":false,"linux":false},{"id":233720,"name":"Surgeon Simulator 2013","windows":true,"mac":true,"linux":true},{"id":204450,"name":"Call of Juarez\u00ae Gunslinger","windows":true,"mac":false,"linux":false},{"id":234710,"name":"Poker Night 2","windows":true,"mac":true,"linux":false},{"id":220200,"name":"Kerbal Space Program","windows":true,"mac":true,"linux":true},{"id":65930,"name":"The Bureau: XCOM Declassified","windows":true,"mac":true,"linux":false},{"id":222730,"name":"Reus","windows":true,"mac":false,"linux":false},{"id":238890,"name":"Skyward Collapse","windows":true,"mac":true,"linux":true},{"id":206190,"name":"Gunpoint","windows":true,"mac":true,"linux":true},{"id":223830,"name":"Xenonauts","windows":true,"mac":false,"linux":false},{"id":241600,"name":"Rogue Legacy","windows":true,"mac":true,"linux":true},{"id":237570,"name":"Penny Arcade\'s On the Rain-Slick Precipice of Darkness 4","windows":true,"mac":false,"linux":false},{"id":242920,"name":"Banished","windows":true,"mac":false,"linux":false},{"id":233250,"name":"Planetary Annihilation","windows":true,"mac":true,"linux":true},{"id":224060,"name":"Deadpool","windows":true,"mac":false,"linux":false},{"id":241410,"name":"CastleStorm","windows":true,"mac":false,"linux":false},{"id":39140,"name":"FINAL FANTASY VII","windows":true,"mac":false,"linux":false},{"id":244850,"name":"Space Engineers","windows":true,"mac":false,"linux":false},{"id":206420,"name":"Saints Row IV","windows":true,"mac":false,"linux":false},{"id":246900,"name":"Viscera Cleanup Detail","windows":true,"mac":false,"linux":false},{"id":255520,"name":"Viscera Cleanup Detail: Shadow Warrior","windows":true,"mac":false,"linux":false},{"id":265210,"name":"Viscera Cleanup Detail: Santa\'s Rampage","windows":true,"mac":false,"linux":false},{"id":246940,"name":"Lords of the Black Sun","windows":true,"mac":false,"linux":false},{"id":247020,"name":"Cook, Serve, Delicious!","windows":true,"mac":true,"linux":true},{"id":214770,"name":"Guacamelee! Gold Edition","windows":true,"mac":true,"linux":true},{"id":239030,"name":"Papers, Please","windows":true,"mac":true,"linux":true},{"id":237630,"name":"DuckTales: Remastered","windows":true,"mac":false,"linux":false},{"id":248390,"name":"Craft The World","windows":true,"mac":true,"linux":false},{"id":218620,"name":"PAYDAY 2","windows":true,"mac":false,"linux":false},{"id":209000,"name":"Batman\u2122: Arkham Origins","windows":true,"mac":false,"linux":false},{"id":239820,"name":"Game Dev Tycoon","windows":true,"mac":true,"linux":true},{"id":2870,"name":"X Rebirth","windows":true,"mac":false,"linux":false},{"id":236850,"name":"Europa Universalis IV","windows":true,"mac":true,"linux":true},{"id":250180,"name":"METAL SLUG 3","windows":true,"mac":false,"linux":false},{"id":237890,"name":"Agarest: Generations of War","windows":true,"mac":false,"linux":false},{"id":251150,"name":"The Legend of Heroes: Trails in the Sky","windows":true,"mac":false,"linux":false},{"id":251570,"name":"7 Days to Die","windows":true,"mac":true,"linux":true},{"id":243450,"name":"Urban Trial Freestyle","windows":true,"mac":false,"linux":false},{"id":242050,"name":"Assassin\u2019s Creed\u00ae IV Black Flag\u2122","windows":true,"mac":false,"linux":false},{"id":250400,"name":"How to Survive","windows":true,"mac":false,"linux":false},{"id":49520,"name":"Borderlands 2","windows":true,"mac":true,"linux":true},{"id":245470,"name":"Democracy 3","windows":true,"mac":true,"linux":true},{"id":246090,"name":"Spacebase DF-9","windows":true,"mac":true,"linux":true},{"id":221910,"name":"The Stanley Parable","windows":true,"mac":true,"linux":false},{"id":261030,"name":"The Walking Dead: Season 2","windows":true,"mac":true,"linux":false},{"id":252150,"name":"Grimm","windows":true,"mac":false,"linux":false},{"id":261760,"name":"Lichdom: Battlemage","windows":true,"mac":false,"linux":false},{"id":105450,"name":"Age of Empires\u00ae III: Complete Collection","windows":true,"mac":false,"linux":false},{"id":221380,"name":"Age of Empires II HD","windows":true,"mac":false,"linux":false},{"id":263760,"name":"Turbo Dismount\u2122","windows":true,"mac":true,"linux":false},{"id":263840,"name":"Out of the Park Baseball 14","windows":true,"mac":true,"linux":true},{"id":265610,"name":"Epic Battle Fantasy 4","windows":true,"mac":false,"linux":false},{"id":265930,"name":"Goat Simulator","windows":true,"mac":true,"linux":true},{"id":266840,"name":"Age of Mythology: Extended Edition","windows":true,"mac":false,"linux":false},{"id":224040,"name":"LocoCycle","windows":true,"mac":false,"linux":false},{"id":270850,"name":"Car Mechanic Simulator 2014","windows":true,"mac":true,"linux":false},{"id":235460,"name":"METAL GEAR RISING: REVENGEANCE","windows":true,"mac":true,"linux":false},{"id":228380,"name":"Next Car Game: Wreckfest","windows":true,"mac":false,"linux":false},{"id":272860,"name":"Next Car Game Sneak Peek 2.0","windows":true,"mac":false,"linux":false},{"id":274190,"name":"Broforce","windows":true,"mac":true,"linux":false},{"id":237870,"name":"Planet Explorers","windows":true,"mac":true,"linux":true},{"id":48700,"name":"Mount & Blade: Warband","windows":true,"mac":true,"linux":true},{"id":287450,"name":"Rise of Nations: Extended Edition","windows":true,"mac":false,"linux":false},{"id":290080,"name":"Life is Feudal: Your Own","windows":true,"mac":false,"linux":false},{"id":33910,"name":"Arma 2","windows":true,"mac":false,"linux":false},{"id":33930,"name":"Arma 2: Operation Arrowhead","windows":true,"mac":false,"linux":false},{"id":65700,"name":"Arma 2: British Armed Forces","windows":true,"mac":false,"linux":false},{"id":65720,"name":"Arma 2: Private Military Company","windows":true,"mac":false,"linux":false},{"id":219540,"name":"Arma 2: Operation Arrowhead Beta (Obsolete)","windows":true,"mac":false,"linux":false},{"id":224580,"name":"Arma II: DayZ Mod","windows":true,"mac":false,"linux":false},{"id":226860,"name":"Galactic Civilizations\u00ae III","windows":true,"mac":false,"linux":false},{"id":201810,"name":"Wolfenstein: The New Order","windows":true,"mac":false,"linux":false},{"id":289130,"name":"Endless Legend\u2122","windows":true,"mac":true,"linux":false},{"id":298630,"name":"The Escapists","windows":true,"mac":false,"linux":false},{"id":238460,"name":"BattleBlock Theater\u00ae","windows":true,"mac":false,"linux":true},{"id":300550,"name":"Shadowrun: Dragonfall - Director\'s Cut","windows":true,"mac":true,"linux":true},{"id":292120,"name":"FINAL FANTASY\u00ae XIII","windows":true,"mac":false,"linux":false},{"id":303800,"name":"The Witcher Adventure Game","windows":true,"mac":true,"linux":false},{"id":243470,"name":"Watch_Dogs\u2122","windows":true,"mac":false,"linux":false},{"id":306660,"name":"Ultimate General: Gettysburg","windows":true,"mac":true,"linux":true},{"id":310080,"name":"Hatoful Boyfriend","windows":true,"mac":true,"linux":true},{"id":240760,"name":"Wasteland 2","windows":true,"mac":true,"linux":true},{"id":259130,"name":"Wasteland 1 - The Original Classic","windows":true,"mac":true,"linux":true},{"id":312990,"name":"The Expendabros","windows":true,"mac":true,"linux":false},{"id":243970,"name":"Invisible, Inc.","windows":true,"mac":true,"linux":false},{"id":65980,"name":"Sid Meier\'s Civilization\u00ae: Beyond Earth\u2122","windows":true,"mac":true,"linux":true},{"id":241930,"name":"Middle-earth\u2122: Shadow of Mordor\u2122","windows":true,"mac":false,"linux":false},{"id":289930,"name":"TransOcean - The Shipping Company","windows":true,"mac":true,"linux":false},{"id":294860,"name":"Valkyria Chronicles\u2122","windows":true,"mac":false,"linux":false},{"id":282070,"name":"This War of Mine","windows":true,"mac":true,"linux":true},{"id":12120,"name":"Grand Theft Auto: San Andreas","windows":true,"mac":false,"linux":false},{"id":12250,"name":"Grand Theft Auto: San Andreas","windows":false,"mac":true,"linux":false},{"id":346010,"name":"Besiege","windows":true,"mac":true,"linux":true},{"id":333950,"name":"Medieval Engineers","windows":true,"mac":false,"linux":false}]

//NOTE: Steam seems to have done some weird stuff with the Sam & Max series, and either the API returns nothing, or it is the generic "season" title. These have to be done by hand, sorry!

//HUMBLE DATA ---------------------------------------------------------------------------------------------------------------
//NOTE: (only front-end solution available for humble bundle, NOT SURE ABOUT humble store)

/*
var gameData = {"windows": Array(), "mac": Array(), "linux": Array()};
jQuery(".js-all-downloads-holder .row").each(function(idx, row){
	var $row = jQuery(row);
	var name = $row.data("human-name");
	var hasLinuxDownloads = $row.children(".js-platform.downloads.linux").children(".download-buttons").html(),
		hasMacDownloads = $row.children(".js-platform.downloads.mac").children(".download-buttons").html(),
		hasWindowsDownloads = $row.children(".js-platform.downloads.windows").children(".download-buttons").html();
	if(hasLinuxDownloads.trim() != ""){
		gameData.linux.push(name);
	}
	if(hasMacDownloads.trim() != ""){
		gameData.mac.push(name);
	}
	if(hasWindowsDownloads.trim() != ""){
		gameData.windows.push(name);
	}	
});
console.log(JSON.stringify(gameData));
*/

//Slightly different format...
//{"windows":["Anomaly Warzone Earth","Aquaria","Battle Frogs","City Generator Tech Demo","Cook, Serve, Delicious!","Crayon Physics Deluxe","DEFCON","Darwinia","Dungeons of Dredmor","EDGE","Endless Nuclear Kittens","Low Light Combat","Multiwinia","Nuclear Pizza War","Osmos","Out of the Park Baseball 14","Space Hunk","Tektonik","Toki Tori","Universe Sandbox","Uplink","Voxel Tech Demo",3918,"Wasteland Kings","World Of Goo"],"mac":["Anomaly Warzone Earth","Aquaria","Battle Frogs","Cook, Serve, Delicious!","Crayon Physics Deluxe","DEFCON","Darwinia","Dungeons of Dredmor","EDGE","Endless Nuclear Kittens","Low Light Combat","Multiwinia","Nuclear Pizza War","Osmos","Out of the Park Baseball 14","Space Hunk","Tektonik","Toki Tori","Uplink","World Of Goo"],"linux":["Anomaly Warzone Earth","Aquaria","Battle Frogs","Cook, Serve, Delicious!","Crayon Physics Deluxe","DEFCON","Darwinia","Dungeons of Dredmor","EDGE","Endless Nuclear Kittens","Low Light Combat","Multiwinia","Nuclear Pizza War","Osmos","Out of the Park Baseball 14","Toki Tori","Uplink","World Of Goo"]}
?>