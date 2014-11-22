$(document).ready(function(){
	
	// Here's my data model
	var Games = function() {
		var self = this;
		this.currentGameId = ko.observable();
		this.currentGame = ko.observable();
		this.mostRecentAjaxSuccess = ko.observable("");
		this.mostRecentAjaxFailure = ko.observable("");
		
		$('.search').autocomplete({
			source: function( request, response ){
				$.getJSON(
					'api.php/games/search/' + request.term,
					function(data){
						response(
							$.map(data.results, function( item ){
								return {
									label: item.title + " (" + item.source + ")",
									value: item.id
								}
							})
						);
					}
				);
			},
			select: function(event, ui){
				event.preventDefault();
				$('.search').val(ui.item.label);
				self.currentGameId(ui.item.value);
			},
			focus: function(event, ui){
				event.preventDefault();
				//$('.search').val(ui.item.label);
			},
			position: { my: "left top", at: "left bottom", collision: "none" },
			appendTo: "#container"
		});
		
		this.currentGameId.subscribe(function(newProductId){
			if(newProductId){
				$.getJSON(
					'api.php/games/' + newProductId,
					function(data){
						if( data.results && data.results[0] ){
							self.currentGame(data.results[0]);
						}
					}
				);
			}else{
				self.currentGame(false);
			}
			
		}.bind(this));
		
		this.updateGame = function(){
			$.ajax({
				type: 'PUT',
				contentType: 'application/json',
				url: 'api.php/games/' + self.currentGameId(),
				dataType: "json",
				data: JSON.stringify(self.currentGame()),
				success: function(response, textStatus, jqXHR){
					console.log(response);
					self.mostRecentAjaxSuccess(response);
				},
				error: function(jqXHR, textStatus, errorThrown){
					console.log(jqXHR);
					console.log(textStatus);
					console.log(errorThrown);
				}
			});
		}
		
		this.newGame = function(){
			$.ajax({
				type: 'POST',
				contentType: 'application/json',
				url: 'api.php/games/' + self.currentGameId(),
				dataType: "json",
				data: JSON.stringify(self.currentGame()),
				success: function(response, textStatus, jqXHR){
					console.log(response);
					self.mostRecentAjaxSuccess(response);
				},
				error: function(jqXHR, textStatus, errorThrown){
					console.log(jqXHR);
					console.log(textStatus);
					console.log(errorThrown);
				}
			});
		}
		
		this.deleteGame = function(){
			$.ajax({
				type: 'DELETE',
				contentType: 'application/json',
				url: 'api.php/games/' + self.currentGameId(),
				dataType: "json",
				success: function(response, textStatus, jqXHR){
					console.log(response);
					self.mostRecentAjaxSuccess(response);
					self.currentGameId(undefined);
				},
				error: function(jqXHR, textStatus, errorThrown){
					console.log(jqXHR);
					console.log(textStatus);
					console.log(errorThrown);
				}
			});
		}
		
		ko.bindingHandlers.showSuccess = {
		    init: function(element, valueAccessor) {
		        $(element).hide();
		    },
		    update: function(element, valueAccessor) {
		        // On update, fade in/out
		        var message = valueAccessor();
		        if(message && message != ""){
					$(element).text(message.msg).slideDown(500).delay(3000).slideUp(500);	
		        }
		    } 
		};
		
		ko.bindingHandlers.showError = {
		    init: function(element, valueAccessor) {
		        $(element).hide();
		    },
		    update: function(element, valueAccessor) {
		        // On update, fade in/out
		        var message = valueAccessor();
		        if(message && message != ""){
					$(element).text(message.msg).slideDown(500).delay(3000).slideUp(500);	
		        }
		    } 
		};
		
		ko.bindingHandlers.showEditPanel = {
		    init: function(element, valueAccessor) {
		        $(element).hide();
		    },
		    update: function(element, valueAccessor) {
		        // On update, fade in/out
		        var show = valueAccessor();
		        if(show){
					$(element).slideDown(500);	
		        }else{
		        	$(element).slideUp(500);
		        }
		    } 
		};
	};
	
	ko.applyBindings(new Games());
	
});