

class AutoComplete{

	delay: number = 300;
	selectedResultIndex: number;
	results: any;

	$searchResultsList: JQuery;
	$searchResultTemplate: JQuery;
	element: HTMLInputElement;
	selectionStart: number;

	constructor(public $element: JQuery, public autoCompletePath: string, public onSelect: any){

        // create ui.
        this.$searchResultsList = $('<ul></ul>');
        this.$element.parent().prepend(this.$searchResultsList);

        this.$searchResultTemplate = $('<li><a href="#"></a></li>');

        // init ui.

        // callback after set period.
        var typewatch = (function () {
            var timer = 0;
            return function (callback, ms) {
                clearTimeout(timer);
                timer = setTimeout(callback, ms);
            };
        })();

        var that = this;

        // validate

        // prevent invalid characters being entered
        this.$element.on("keydown", function(event) {

            if (!that.isValidKey(event.keyCode)) {
                event.preventDefault();
                return false;
            }

            return true;
        });

        // auto complete
        this.$element.on("keyup", function(event) {

        	event.preventDefault();

        	// if a list item is selected and pressing enter
            if (!that.getSelectedListItem().length && event.keyCode == 13) { // enter
                that.onSelect(that.getTerms());
                return;
            }

            // If there are search results
            if (that.$searchResultsList.is(':visible') && that.results.length) {
                if (event.keyCode == 13) {
                    // enter
                    that.searchForItem(that.getSelectedListItem());
                } else if (event.keyCode == 40) {
                    that.setSelectedResultIndex(1);
                    return;
                } else if (event.keyCode == 38) {
                    that.setSelectedResultIndex(-1);
                    return;
                }
            }

            // after a delay, show autocomplete list.
            typewatch(() => {
                
            	// don't do anything if not a valid key.
                if (!that.isValidKey(event.keyCode)) {
                    event.preventDefault();
                    return false;
                }

                var val = that.getTerms();

                // if there are more than 2 chars and no spaces
                // update the autocomplete list.
                if (val && val.length > 2 && val.indexOf(' ') == -1) {
                    that.search(val);
                } else {
                    // otherwise, hide the autocomplete list.
                    that.clearResults();
                    that.hideResults();
                }

                return true;

            }, that.delay);
        });

        // hide results if clicked outside.
        $(document).on('mouseup', (e) => {
            if (this.$searchResultsList.parent().has($(e.target)[0]).length === 0) {
                this.clearResults();
                this.hideResults();
            }
        });

        this.hideResults();
    }

    getTerms(): string {
        return this.$element.val().fulltrim();
    }

    setSelectedResultIndex(direction): void {

        var nextIndex;

        if (direction == 1) {
            nextIndex = this.selectedResultIndex + 1;
        } else {
            nextIndex = this.selectedResultIndex - 1;
        }

        var $items = this.$searchResultsList.find('li');

        if (nextIndex < 0) {
            nextIndex = $items.length - 1;
        } else if (nextIndex > $items.length - 1) {
            nextIndex = 0;
        }

        this.selectedResultIndex = nextIndex;

        $items.removeClass('selected');

        var selectedItem = $items.eq(this.selectedResultIndex);

        selectedItem.addClass('selected');

        //var top = selectedItem.offset().top;
        var top = selectedItem.outerHeight(true) * this.selectedResultIndex;

        this.$searchResultsList.scrollTop(top);
    }

    isValidKey(keyCode): boolean {

    	// up and down are invalid. otherwise get converted to
    	// '&'' and '(' respectively.
    	if (keyCode == 38 || keyCode == 40) return false;

        // ignore if it's a backspace or space.
        if (keyCode != 8 && keyCode != 32) {
            // prev:  new RegExp("^[a-zA-Z]+$");
            // standard keyboard non-control characters
            var regex = new RegExp("^[\\w()!£$%^&*()-+=@'#~?<>|/\\\\]+$");
            //var regex = new RegExp("^[\\w]+$");
            //var key = String.fromCharCode(!event.charCode ? event.which : event.charCode);
            var key = String.fromCharCode(keyCode);

            if (!regex.test(key)) {
                return false;
            }
        }

        return true;
    }

    search(term): void {

        this.results = [];

        this.clearResults();
        this.showResults();
        this.$searchResultsList.append('<li class="loading"></li>');

        this.updateListPosition();

        var that = this;

        $.getJSON(this.autoCompletePath + '?term=' + term, function (results) {
            that.listResults(results);
        });
    }

    clearResults(): void {
        this.$searchResultsList.empty();
    }

    hideResults(): void {
        this.$searchResultsList.hide();
    }

    showResults(): void {
        this.selectedResultIndex = -1;
        this.$searchResultsList.show();
    }

    updateListPosition(): void {
        this.$searchResultsList.css({
            'top': this.$searchResultsList.outerHeight(true) * -1
        });
    }

    listResults(results): void {
        this.results = results;

        this.clearResults();

        if (!this.results.length) {
            // don't do this, because there still may be results for the PHRASE but not the word.
            // they won't know until they do the search.
            //this.searchResultsList.append('<li>no results</li>');
            this.hideResults();
            return;
        }

        for (var i = 0; i < this.results.length; i++) {
            var result = this.results[i];

            var $resultItem = this.$searchResultTemplate.clone();

            var $a = $resultItem.find('a');

            $a.text(result);

            this.$searchResultsList.append($resultItem);
        }

        this.updateListPosition();

        var that = this;

        this.$searchResultsList.find('li').on('click', function (e) {
            e.preventDefault();

            that.searchForItem($(this));
        });
    }

    searchForItem($item): void {
        var term = $item.find('a').text();

        this.onSelect(term);

        this.clearResults();
        this.hideResults();
    }

    getSelectedListItem() {
        return this.$searchResultsList.find('li.selected');
    }

}

export = AutoComplete;