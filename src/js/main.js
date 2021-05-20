/* initialize:
---------------*/

$(document).ready(function () {

	$(document).ajaxStart(function(){
			$('#loader').show();
		}).ajaxStop(function(){
			$('#loader').hide();
	});
	
	
	$.ajaxSetup({
		scriptCharset: "utf-8",
		contentType: "application/json; charset=utf-8"
	});

});

/* functions:
---------------*/

function getUrlParam(ParamType) {

	const queryString = window.location.search;
	const urlParams = new URLSearchParams(queryString);
	
	var urlParam = urlParams.get(ParamType);

return (urlParam);

}

function getZenonRecordByRecordId (recordId) {

	var ZenonApiUrl = "https://zenon.dainst.org/api/v1/search?lookfor=" + recordId + "&type=SystemNo&prettyPrint=false&lng=de";
	
	$.ajax({
		type:'GET',
		dataType: "json",
		url: ZenonApiUrl,
		success: function(data) {
			var zenonData = data.records[0];

			if (zenonData.hasOwnProperty('parentId')) {
				var parentId = zenonData.parentId;
				StorageParentRecordbyParentId (parentId);
				// wait for storage update
				setTimeout(function(){parseZenonData(zenonData, parentId);}, 1000); 
			}
			else {
				localStorage.removeItem('ParentRecord');
				parseZenonData(zenonData, false);
			}
			
		},
		error: function(response) {
			alert("Fehler: Zenon-Datensatz nicht abrufbar.");
		}
	});
}

function StorageParentRecordbyParentId (parentId) {
	
	localStorage.removeItem('ParentRecord');

	var ZenonApiUrl = "https://zenon.dainst.org/api/v1/search?lookfor=" + parentId + "&type=SystemNo&prettyPrint=false&lng=de";

	$.ajax({
		type:'GET',
		dataType: "json",
		url: ZenonApiUrl,
		success: function(data) {
			var ParentRecordData = data.records[0];
			localStorage.setItem('ParentRecord', JSON.stringify(ParentRecordData));
			console.log(ParentRecordData);

		},
		error: function(response) {
			alert("Fehler: Daten des Parent-Records nicht abrufbar.");
		}
	});
}

function parseAuthorNames(authorsTotal) {

	authorsRoleAut = [];		// "aut" -> real authors
	authorsOtherRole = [];		// e.g. "edt" -> "Hrsg."

	// prioritize primary and secondary authors:
	if(authorsTotal.primary !== false || authorsTotal.secondary !== false) {
		delete authorsTotal.corporate;
	}

	// parse author names:
	Object.entries(authorsTotal).forEach(([key, authors]) => {
		
		if(authors !== false) {

			Object.entries(authors).forEach(([author, role]) => {
				
				// remove year of birth from author names:
				var firstDigit = author.match(/\d/);
				var pos = author.indexOf(firstDigit);
				author = (pos !== -1)  ? author.substring(0, pos) : author;
				author = author.replace(/,\s*$/, "");

				var charCheck1 = (author !== undefined) ? author.charAt(author.length-3) : "-";
				var charCheck2 = (author !== undefined) ? author.charAt(author.length-4) : "-";

				// remove "zenon-dot" at the end of givenName:
				if(charCheck1 === " " || charCheck2 === " ") {
					var authorName = (author !== undefined) ? author : "";
				}
				else {
					var authorName = (author!== undefined) ? author.replace(/\.$/, "") : "";
				}
				
				// get author role
				var role = (role.hasOwnProperty('role') && role.role[0] !== undefined) ? role.role[0] : false;
			
				
				// filter authorNames by role
				if(role == "aut" || role == false) {
					authorsRoleAut.push(authorName);
				}
				else {
					authorsOtherRole.push(authorName);
				};
				
			});
		}
	});
	
	// collect authorNames as String
	if (authorsRoleAut.length !== 0) {
		var StringAuthorNames = authorsRoleAut.join(' - ');		// "aut" preferred;
	}
	else{
		var authorsRoleAutString = authorsRoleAut.join(' - ');
		var authorsOtherRoleString = authorsOtherRole.join(' - ');
		
		if(authorsRoleAut.length !== 0 && authorsOtherRole.length !== 0) {
			var StringAuthorNames = authorsRoleAutString + " - " + authorsOtherRoleString;
		}
		else if (authorsRoleAut.length !== 0 && authorsOtherRole.length == 0) {
			var StringAuthorNames = authorsRoleAutString;
		}
		else {
			var StringAuthorNames = authorsOtherRoleString;
		}
	
	}

return(StringAuthorNames);

}

function parseZenonData(zenonData, parentId) {

	console.log(zenonData);

	// Zenon Record (e.g. article, monograph):
	var zenonId = zenonData.id;
	var pubType = zenonData.bibliographicLevel;
	var title = zenonData.title;

	var primaryAuthors = (zenonData.authors.primary.length !== 0) ? zenonData.authors.primary : false;
	var secondaryAuthors = (zenonData.authors.secondary.length !== 0) ? zenonData.authors.secondary : false;
	var corporateAuthors = (zenonData.authors.corporate.length !== 0) ? zenonData.authors.corporate : false;
	var authorsTotal = {"primary": primaryAuthors, "secondary": secondaryAuthors, "corporate": corporateAuthors};
	var StringAuthorNames = parseAuthorNames(authorsTotal);

	var seriesName = (zenonData.series.length !== 0) ? zenonData.series[0].name : false;
	var seriesNumber = (zenonData.series.length !== 0 && zenonData.series[0].hasOwnProperty('number')) ? zenonData.series[0].number : "";
	var containerPageRange = (zenonData.hasOwnProperty('containerPageRange')) ? zenonData.containerPageRange : "";
	
	var partOrSectionInfo = (zenonData.hasOwnProperty('partOrSectionInfo')) ? zenonData.partOrSectionInfo : "";

	// Parent Record (e.g. Journal, 'Sammelwerk'):
	var ParentRecord = (parentId !== false) ? localStorage.getItem('ParentRecord') : false;
	var Parent = (parentId !== false) ? JSON.parse(ParentRecord) : false;
	var ParentTitle = (parentId !== false) ? Parent.title : false;
	var ParentIssue = (parentId !== false) ? Parent.partOrSectionInfo : "-";

	var ParentPrimaryAuthors = (parentId !== false) ? Parent.authors.primary : false;
	var ParentSecondaryAuthors = (parentId !== false) ? Parent.authors.secondary : false;
	var ParentCorporateAuthors = (parentId !== false) ? Parent.authors.corporate : false;
	var ParentAuthorsTotal = {"primary": ParentPrimaryAuthors, "secondary": ParentSecondaryAuthors, "corporate": ParentCorporateAuthors};

	var ParentStringAuthorNames = (parentId !== false) ? parseAuthorNames(ParentAuthorsTotal) : false;

	let ParsedZenonData = {
		'zenonId': zenonId,
		'pubType': pubType,
		'title': title,
		'StringAuthorNames': StringAuthorNames,
		'seriesName': seriesName,
		'seriesNumber': seriesNumber,
		'containerPageRange': containerPageRange,
		'partOrSectionInfo': partOrSectionInfo,
		'parentId': parentId,
		'ParentTitle': ParentTitle,
		'ParentIssue': ParentIssue,
		'ParentStringAuthorNames': ParentStringAuthorNames,
	}
	appendParsedZenonDataToDOM(ParsedZenonData);
}

function appendParsedZenonDataToDOM(ParsedZenonData) {
	
	let pubTypeFromUrl = getUrlParam('pubType');
	
	// define pubType (predefinded in ZenonData by default)
	if (pubTypeFromUrl !== null) {
		
		var givenPubType = getUrlParam('pubType');
		
		switch (givenPubType) {
			case "Zeitschriftenausgabe":
				var type = "Serial";
			break;
			
			case "Artikel":
				var type = "SerialPart";
			break;
		  
			case "Monographie":
				var type = "Monograph";
			break;
			
			case "Sammelwerk-Beitrag":
				var type = "MonographPart";
			break;
		
		    default:
				var type = ParsedZenonData.pubType;
				alert("Fehler: Angegebener pubType nicht bekannt ");
		}
	}
	else {
		var type = ParsedZenonData.pubType;
	}

	// get ParentId and seriesName:
	var ParentId = ParsedZenonData.parentId;
	var seriesName = ParsedZenonData.seriesName;


	// journal / serial issue
	if (type == "Serial" && ParentId !== false) {
		
		$('#section_metadata').append("<p id = 'title' contentEditable='plaintext-only' contenteditable='true'>" + ParsedZenonData.title + " " + ParsedZenonData.partOrSectionInfo + "</p>");
		$('#section_metadata').append("<p contentEditable='plaintext-only' contenteditable='true'>eine Ausgabe von / <span class = 'english_text'>an issue of: </span>" + ParsedZenonData.ParentTitle + "</p>");
		
	}
	// Monograph
	else if(type === "Monograph" || ParentId === false) {

		$('#section_metadata').append("<p id = 'author' contentEditable='plaintext-only' contenteditable='true'>" + ParsedZenonData.StringAuthorNames + "</p>");
		$('#section_metadata').append("<p id = 'title' contentEditable='plaintext-only' contenteditable='true'>" + ParsedZenonData.title + "</p>");

		if(seriesName !== false) {
			$('#section_metadata').append("<p>der Reihe / <span class = 'english_text'>of the series</span></p>");
			$('#section_metadata').append("<p id = 'series' contentEditable='plaintext-only' contenteditable='true'>" + ParsedZenonData.seriesName + " " + ParsedZenonData.seriesNumber + "</p>");
		};

	}
	// conference paper ("Sammelwerke")
	else if(type === "MonographPart" || (ParentId !== false && type !== "SerialPart") ) {

		$('#section_metadata').append("<p id = 'author' contentEditable='plaintext-only' contenteditable='true'>" + ParsedZenonData.StringAuthorNames + "</p>");
		$('#section_metadata').append("<p id = 'title' contentEditable='plaintext-only' contenteditable='true'>" + ParsedZenonData.title + "</p>");
		$('#section_metadata').append("<p id = 'beitrag_title' contentEditable='plaintext-only' contenteditable='true'><span class = 'english_text'>in: </span>" + ParsedZenonData.ParentStringAuthorNames + " (Hrsg.), " + ParsedZenonData.ParentTitle + " " + ParsedZenonData.containerPageRange + ".</p>");

	}
	// journal paper
	else if(type == "SerialPart" && ParentId !== false || (ParentId  !== false && type !== "MonographPart")) {
		
		$('#section_metadata').append("<p id = 'author' contentEditable='plaintext-only' contenteditable='true'>" + ParsedZenonData.StringAuthorNames + "</p>");
		$('#section_metadata').append("<p id = 'title' contentEditable='plaintext-only' contenteditable='true'>" + ParsedZenonData.title + "</p>");
		$('#section_metadata').append("<p>aus / <span class = 'english_text'>from</span></p>");
		$('#section_metadata').append("<p id = 'journal' contentEditable='plaintext-only' contenteditable='true'>" +  ParsedZenonData.ParentTitle + ", " + ParsedZenonData.ParentIssue + " " + ParsedZenonData.containerPageRange + "</p>");
	}
	else {
		alert("Fehler: Bibliographic Level in den Zenon-Daten fehlerhaft oder nicht ermittelbar.");
	}

	appendDoiToDOM();
	appendImpressumToDOM();
}

function appendDoiToDOM() {

	// inject #section_pubIds:
	$('#section_pubIds').append("<tr><td class = 'identifier_label'>DOI:</td><td><a id = 'doiEdit' contentEditable='plaintext-only' contenteditable='true' onkeyup = 'setGivenDoiAsHrefAttribute()'>https://doi.org/10.34780/########</a></td></tr>");
}

function appendImpressumToDOM() {
	
	var date = new Date();
	var copyrightYear = date.getFullYear();

	// add publisher:
	$('#section_publisher').append("<p style = 'font-weight: 600;'>Herausgebende Institution / <span class = 'english_text'>Publisher<span class = 'english_text'>:</p>");
	$('#section_publisher').append("<p>Deutsches Archäologisches Institut</p>");
	
	// add copyright:
	$('#section_copyright').append("<p><strong>Copryright (Digital Edition) © "+ copyrightYear + " Deutsches Archäologisches Institut</strong></p>");
	$('#section_copyright').append("<p>Deutsches Archäologisches Institut, Zentrale, Podbielskiallee 69–71, 14195 Berlin, Tel: +49 30 187711-0</p>");
	$('#section_copyright').append("<p>Email: info@dainst.de | Web: https://www.dainst.org</p>");

	// add terms of use:
	$('#section_termsOfUse').append("<p style = 'text-align: justify;'><strong>Nutzungsbedingungen</strong>: Mit dem Herunterladen erkennen Sie die Nutzungsbedingungen (https://publications.dainst.org/terms-of-use) von iDAI.publications an. Sofern in dem Dokument nichts anderes ausdrücklich vermerkt ist, gelten folgende Nutzungsbedingungen: " +
	"Die Nutzung der Inhalte ist ausschließlich privaten Nutzerinnen / Nutzern für den eigenen wissenschaftlichen und sonstigen privaten Gebrauch gestattet. Sämtliche Texte, Bilder und sonstige Inhalte in diesem Dokument unterliegen dem Schutz des Urheberrechts gemäß dem Urheberrechtsgesetz der Bundesrepublik Deutschland. " + 
	"Die Inhalte können von Ihnen nur dann genutzt und vervielfältigt werden, wenn Ihnen dies im Einzelfall durch den Rechteinhaber oder die Schrankenregelungen des Urheberrechts gestattet ist. Jede Art der Nutzung zu gewerblichen Zwecken ist untersagt. Zu den Möglichkeiten einer " +
	"Lizensierung von Nutzungsrechten wenden Sie sich bitte direkt an die verantwortlichen Herausgeberinnen/Herausgeber der entsprechenden Publikationsorgane oder an die Online-Redaktion des Deutschen Archäologischen Instituts (info@dainst.de). Etwaige davon abweichende Lizenzbedingungen sind im Abbildungsnachweis vermerkt.</p>");
	
	$('#section_termsOfUse').append("<p style = 'text-align: justify;' class = 'english_text'><strong>Terms of use</strong>: By downloading you accept the terms of use (https://publications.dainst.org/terms-of-use) of iDAI.publications. Unless otherwise stated in the document, the following terms of use are applicable: All materials including texts, articles, images and " +
	"other content contained in this document are subject to the German copyright. The contents are for personal use only and may only be reproduced or made accessible to third parties if you have gained permission from the copyright owner. Any form of commercial use is expressly prohibited. When seeking the granting " +
	"of licenses of use or permission to reproduce any kind of material please contact the responsible editors of the publications or contact the Deutsches Archäologisches Institut (info@dainst.de). Any deviating terms of use are indicated in the credits.</p>");

}

function setGivenDoiAsHrefAttribute() {
	
	var doiEdit = document.getElementById('doiEdit');
	
	// normal input by keyboard
	doiEdit.addEventListener("input", 
		
		function() {
			
			var doi = document.getElementById('doiEdit').innerHTML;
			doiEdit.setAttribute('href', doi);
			
		});
		
	// copy paste
	doiEdit.addEventListener("copy", 
		
		function() {
			
			var doi = document.getElementById('doiEdit').innerHTML;
			doiEdit.setAttribute('href', doi);
			
		});
}

function setPubTypByButtonInput(pubType) {
	
	var currentUrlwithoutPubType = window.location.href.split('&')[0];
	window.location.href = currentUrlwithoutPubType + "&pubType=" + pubType;
}


/* main:
-----------*/

// get zenonId from url
var zenonId = getUrlParam('zenonId');

// default set
if (zenonId === null) {window.location.href = window.location.href + "?zenonId=002023382";} 

// go
getZenonRecordByRecordId(zenonId);
