/// <reference path="../../js/jquery.d.ts" />
/// <reference path="../../js/extensions.d.ts" />

import coreExtension = require("../../extensions/coreplayer-seadragon-extension/extension");
import extension = require("../../extensions/wellcomeplayer-seadragon-extension/extension");
import baseExtension = require("../coreplayer-shared-module/baseExtension");
import footer = require("../wellcomeplayer-extendedfooterpanel-module/footerPanel");
import utils = require("../../utils");
import download = require("../wellcomeplayer-dialogues-module/downloadDialogue");
import AutoComplete = require("./autocomplete");
import IWellcomeSeadragonProvider = require("../../extensions/wellcomeplayer-seadragon-extension/iWellcomeSeadragonProvider");
import ISeadragonExtension = require("../../extensions/coreplayer-seadragon-extension/iSeadragonExtension");

export class FooterPanel extends footer.FooterPanel {

    $searchContainer: JQuery;
    $searchOptions: JQuery;
    $searchLabel: JQuery;
    $searchTextContainer: JQuery;
    $searchText: JQuery;
    $searchButton: JQuery;
    $searchPagerContainer: JQuery;
    $searchPagerControls: JQuery;
    $previousResultButton: JQuery;
    $searchResultsInfo: JQuery;
    $clearSearchResultsButton: JQuery;
    $nextResultButton: JQuery;
    $searchResultsContainer: JQuery;
    $line: JQuery;
    $pagePositionMarker: JQuery;
    $pagePositionLabel: JQuery;
    $placemarkerDetails: JQuery;
    $placemarkerDetailsTop: JQuery;
    $placemarkerDetailsBottom: JQuery;

    static PREV_SEARCH_RESULT: string = 'footer.onPrevSearchResult';
    static NEXT_SEARCH_RESULT: string = 'footer.onNextSearchResult';
    static CLEAR_SEARCH: string = 'footer.onClearSearch';
    static SEARCH: string = 'footer.onSearch';
    static VIEW_PAGE: string = 'footer.onViewPage';

    currentPlacemarkerIndex: number;
    placemarkerTouched: boolean = false;
    terms: string;

    constructor($element: JQuery) {
        super($element);
    }

    create(): void {
        
        this.setConfig('footerPanel');
        
        super.create();

        $.subscribe(baseExtension.BaseExtension.ASSET_INDEX_CHANGED, (e, assetIndex) => {
            this.assetIndexChanged();
        });

        $.subscribe(coreExtension.Extension.MODE_CHANGED, (e, mode) => {
            this.modeChanged();
        });

        $.subscribe(extension.Extension.SEARCH_RESULTS, (e, terms, results) => {
            this.displaySearchResults(terms, results);
        });

        $.subscribe(extension.Extension.CREATED, (e) => {
            this.checkForSearchParams();
        });

        // search input.
        this.$searchContainer = $('<div class="search"></div>');
        this.$element.prepend(this.$searchContainer);

        this.$searchOptions = $('<div class="searchOptions"></div>');
        this.$searchContainer.append(this.$searchOptions);

        this.$searchLabel = $('<span class="label">' + this.content.searchWithin + '</span>');
        this.$searchOptions.append(this.$searchLabel);

        this.$searchTextContainer = $('<div class="searchTextContainer"></div>');
        this.$searchOptions.append(this.$searchTextContainer);

        this.$searchText = $('<input class="searchText" type="text" maxlength="100" value="' + this.content.enterKeyword + '"></input>');
        this.$searchTextContainer.append(this.$searchText);

        this.$searchButton = $('<a class="imageButton searchButton"></a>');
        this.$searchTextContainer.append(this.$searchButton);

        // search results.
        this.$searchPagerContainer = $('<div class="searchPager"></div>');
        this.$element.prepend(this.$searchPagerContainer);

        this.$searchPagerControls = $('<div class="controls"></div>');
        this.$searchPagerContainer.prepend(this.$searchPagerControls);

        this.$previousResultButton = $('<a class="imageButton previousResult"></a>');
        this.$searchPagerControls.append(this.$previousResultButton);

        this.$searchResultsInfo = $('<div class="searchResultsInfo"><span class="number">x</span> <span class="foundFor"></span> \'<span class="terms">y</span>\'</div>');
        this.$searchPagerControls.append(this.$searchResultsInfo);

        this.$clearSearchResultsButton = $('<a class="clearSearch">Clear Search</a>');
        this.$searchResultsInfo.append(this.$clearSearchResultsButton);

        this.$nextResultButton = $('<a class="imageButton nextResult"></a>');
        this.$searchPagerControls.append(this.$nextResultButton);

        // placemarker line.
        this.$searchResultsContainer = $('<div class="searchResults"></div>');
        this.$element.prepend(this.$searchResultsContainer);

        this.$line = $('<div class="line"></div>');
        this.$searchResultsContainer.append(this.$line);

        this.$pagePositionMarker = $('<div class="positionPlacemarker"></div>');
        this.$searchResultsContainer.append(this.$pagePositionMarker);

        this.$pagePositionLabel = $('<div class="label"></div>');
        this.$searchResultsContainer.append(this.$pagePositionLabel);

        this.$placemarkerDetails = $('<div class="placeMarkerDetails"></div>');
        this.$searchResultsContainer.append(this.$placemarkerDetails);

        this.$placemarkerDetailsTop = $('<h1></h1>');
        this.$placemarkerDetails.append(this.$placemarkerDetailsTop);

        this.$placemarkerDetailsBottom = $('<p></p>');
        this.$placemarkerDetails.append(this.$placemarkerDetailsBottom);

        // initialise ui.
        this.$searchPagerContainer.hide();
        this.$placemarkerDetails.hide();

        // ui event handlers.
        var that = this;

        this.$searchButton.on('click', (e) => {
            e.preventDefault();

            this.search(this.$searchText.val());
        });

        this.$searchText.on('focus', () => {
            // clear initial text.
            if (this.$searchText.val() == this.content.enterKeyword) this.$searchText.val('');
        });

        this.$placemarkerDetails.on('mouseleave', function() {
            $(this).hide();

            // reset all placemarkers.
            var placemarkers = that.getSearchResultPlacemarkers();
            placemarkers.removeClass('hover');
        });

        this.$placemarkerDetails.on('click', (e) => {
            $.publish(FooterPanel.VIEW_PAGE, [this.currentPlacemarkerIndex]);
        });

        this.$previousResultButton.on('click', (e) => {
            e.preventDefault();

            $.publish(FooterPanel.PREV_SEARCH_RESULT);
        });

        this.$nextResultButton.on('click', (e) => {
            e.preventDefault();

            $.publish(FooterPanel.NEXT_SEARCH_RESULT);
        });

        this.$clearSearchResultsButton.on('click', (e) => {
            e.preventDefault();

            $.publish(FooterPanel.CLEAR_SEARCH);
            this.clearSearchResults();
        });

        this.$searchText.on('keyup', (e) => {
            if (e.keyCode == 13) { // return pressed
                e.preventDefault();
                this.$searchText.blur();
            }
        });

        // hide search options if not enabled/supported.
        if (!this.provider.config.options.searchWithinEnabled ||
            !this.provider.assetSequence.supportsSearch) {
            this.$searchContainer.hide();
            this.$searchPagerContainer.hide();
            this.$searchResultsContainer.hide();

            this.$element.addClass('min');
        }

        new AutoComplete(this.$searchText, (<IWellcomeSeadragonProvider>this.provider).getAutoCompleteUri(), (terms) => {
            this.search(terms);
        });
    }

    checkForSearchParams(): void{
        // if a h or q value is in the hash params, do a search.
        if (this.extension.isDeepLinkingEnabled()){
            
            var terms = utils.Utils.getHashParameter('h', parent.document)
                    || utils.Utils.getHashParameter('q', parent.document);

            if (terms){
                this.terms = terms.replace(/\+/g, " ").replace(/"/g, "");
                // blur search field
                this.$searchText.blur();
                $.publish(FooterPanel.SEARCH, [this.terms]);
            }
        }
    }

    search(terms: string): void {

        this.terms = terms;

        if (this.terms == '' || this.terms == this.content.enterKeyword) {
            this.extension.showDialogue(this.config.modules.genericDialogue.content.emptyValue, function(){
                    this.$searchText.focus();
                });

            return;
        };

        // blur search field
        this.$searchText.blur();

        $.publish(FooterPanel.SEARCH, [this.terms]);
    }

    getSearchResultPlacemarkers(): JQuery {
        return this.$searchResultsContainer.find('.searchResultPlacemarker');
    }

    positionSearchResultPlacemarkers(): void {
        // clear all existing placemarkers
        var placemarkers = this.getSearchResultPlacemarkers();
        placemarkers.remove();

        var pageWidth = this.getPageLineRatio();
        var lineTop = this.$line.position().top;
        var lineLeft = this.$line.position().left;

        var results = (<extension.Extension>this.extension).searchResults;

        var that = this;

        // for each page with a result, place a marker along the line.
        for (var i = 0; i < results.length; i++) {
            var page = results[i];

            var distance = page.index * pageWidth;

            var $placemarker = $('<div class="searchResultPlacemarker" data-index="' + page.index + '"></div>');

            $placemarker[0].ontouchstart = function (e) { that.onPlacemarkerTouchStart.call(this, that) };
            $placemarker.click(function (e) { that.onPlacemarkerClick.call(this, that) });
            $placemarker.mouseenter(function (e) { that.onPlacemarkerMouseEnter.call(this, that) });
            $placemarker.mouseleave(function (e) { that.onPlacemarkerMouseLeave.call(this, e, that) });


            this.$searchResultsContainer.append($placemarker);

            var top = lineTop - $placemarker.height();
            var left = lineLeft + distance - ($placemarker.width() / 2);

            $placemarker.css({
                top: top,
                left: left
            });
        }
    }

    onPlacemarkerTouchStart(that): void {
        that.placemarkerTouched = true;

        var $placemarker = $(this);
        var index = parseInt($placemarker.attr('data-index'));

        $.publish(FooterPanel.VIEW_PAGE, [index]);
    }

    onPlacemarkerClick(that): void {
        if (that.placemarkerTouched) return;

        that.placemarkerTouched = false;

        var $placemarker = $(this);
        var index = parseInt($placemarker.attr('data-index'));

        $.publish(FooterPanel.VIEW_PAGE, [index]);
    }

    onPlacemarkerMouseEnter(that): void {
        if (that.placemarkerTouched) return;

        var $placemarker = $(this);

        $placemarker.addClass('hover');

        var assetIndex = parseInt($placemarker.attr('data-index'));

        var placemarkers = that.getSearchResultPlacemarkers();
        var elemIndex = placemarkers.index($placemarker[0]);

        that.currentPlacemarkerIndex = assetIndex;

        that.$placemarkerDetails.show();

        var title = "{0} {1}";

        var mode = that.extension.getMode();

        if (mode == coreExtension.Extension.PAGE_MODE) {
            var asset = that.extension.getAssetByIndex(assetIndex);

            var orderLabel = asset.orderLabel;

            if (orderLabel == "") {
                orderLabel = "-";
            }

            title = String.prototype.format(title, that.content.pageCaps, orderLabel);
        } else {
            title = String.prototype.format(title, that.content.imageCaps, assetIndex + 1);
        }

        that.$placemarkerDetailsTop.html(title);

        var result = (<extension.Extension>that.extension).searchResults[elemIndex];

        var terms = utils.Utils.ellipsis(that.terms, 20);

        var instancesFoundText;

        if (result.rects.length == 1) {
            instancesFoundText = that.content.instanceFound;
            instancesFoundText = String.prototype.format(instancesFoundText, terms);
        } else {
            instancesFoundText = that.content.instancesFound;
            instancesFoundText = String.prototype.format(instancesFoundText, result.rects.length, terms);
        }

        that.$placemarkerDetailsBottom.html(instancesFoundText);

        var pos = $placemarker.position();

        var top = pos.top - that.$placemarkerDetails.height();
        var left = pos.left;

        if (left < that.$placemarkerDetails.width() / 2) {
            left = 0 - ($placemarker.width() / 2);
        } else if (left > that.$line.width() - (that.$placemarkerDetails.width() / 2)) {
            left = that.$line.width() - that.$placemarkerDetails.width() + ($placemarker.width() / 2);
        } else {
            left -= (that.$placemarkerDetails.width() / 2);
        }

        that.$placemarkerDetails.css({
            top: top,
            left: left
        });
    }

    onPlacemarkerMouseLeave(e, that): void {
        var $placemarker = $(this);

        var newElement = e.toElement || e.relatedTarget;

        var isChild = $(newElement).closest(that.$placemarkerDetails).length;

        if (newElement != that.$placemarkerDetails.get(0) && isChild == 0) {
            that.$placemarkerDetails.hide();
            $placemarker.removeClass('hover');
        }
    }

    setPageMarkerPosition(): void {

        if (this.extension.currentAssetIndex == null) return;

        // position placemarker showing current page.
        var pageLineRatio = this.getPageLineRatio();
        var lineTop = this.$line.position().top;
        var lineLeft = this.$line.position().left;

        var position = this.extension.currentAssetIndex * pageLineRatio;
        var top = lineTop;
        var left = lineLeft + position;

        this.$pagePositionMarker.css({
            top: top,
            left: left
        });

        // if the remaining distance to the right is less than the width of the label
        // shift it to the left.
        var lineWidth = this.$line.width();

        if (left + this.$pagePositionLabel.outerWidth(true) > lineWidth) {
            left -= this.$pagePositionLabel.outerWidth(true);
            this.$pagePositionLabel.removeClass('right');
            this.$pagePositionLabel.addClass('left');
        } else {
            this.$pagePositionLabel.removeClass('left');
            this.$pagePositionLabel.addClass('right');
        }

        this.$pagePositionLabel.css({
            top: top,
            left: left
        });
    }

    clearSearchResults(): void {

        // clear all existing placemarkers
        var placemarkers = this.getSearchResultPlacemarkers();
        placemarkers.remove();

        // clear search input field.
        this.$searchText.val(this.content.enterKeyword);

        // hide pager.
        this.$searchContainer.show();
        this.$searchPagerContainer.hide();

        // set focus to search box.
        this.$searchText.focus();
    }

    getPageLineRatio(): number {

        var lineWidth = this.$line.width();

        // find page/width ratio by dividing the line width by the number of pages in the book.
        if (this.provider.assetSequence.assets.length == 1) return 0;

        return lineWidth / (this.provider.assetSequence.assets.length - 1);
    }

    assetIndexChanged(): void {

        this.setPageMarkerPosition();
        this.setPlacemarkerLabel();

        // show/hide download button.
        if ((<extension.Extension>this.extension).hasPermissionToViewCurrentItem()) {
            this.$downloadButton.show();
        } else {
            this.$downloadButton.hide();
        }
    }

    modeChanged(): void {
        this.setPlacemarkerLabel();
    }

    setPlacemarkerLabel(): void {

        var mode = (<ISeadragonExtension>this.extension).getMode();

        var label = this.content.displaying;
        var index = this.extension.currentAssetIndex;

        if (mode == coreExtension.Extension.PAGE_MODE) {
            var asset = this.extension.getAssetByIndex(index);

            var orderLabel = asset.orderLabel;

            if (orderLabel == "") {
                orderLabel = "-";
            }

            var lastAssetOrderLabel = this.extension.getLastAssetOrderLabel();
            this.$pagePositionLabel.html(String.prototype.format(label, this.content.page, orderLabel, lastAssetOrderLabel));
        } else {
            this.$pagePositionLabel.html(String.prototype.format(label, this.content.image, index + 1, this.provider.assetSequence.assets.length));
        }
    }

    displaySearchResults(terms, results): void {

        if (!results) return;

        this.positionSearchResultPlacemarkers();

        // show pager.
        this.$searchContainer.hide();

        this.$searchPagerControls.css({
            'left': 0
        });

        var $number = this.$searchPagerContainer.find('.number');
        $number.text(results.length);

        var foundFor = this.$searchResultsInfo.find('.foundFor');

        if (results.length == 1) {
            foundFor.html(this.content.resultFoundFor);
        } else {
            foundFor.html(this.content.resultsFoundFor);
        }

        var $terms = this.$searchPagerContainer.find('.terms');
        $terms.html(utils.Utils.ellipsis(terms, 20));
        $terms.prop('title', terms);

        this.$searchPagerContainer.show();

        this.resize();
    }

    resize(): void {
        super.resize();

        if ((<extension.Extension>this.extension).searchResults) {
            this.positionSearchResultPlacemarkers();
        }

        this.setPageMarkerPosition();

        this.$searchPagerContainer.width(this.$element.width());

        var center = this.$element.width() / 2;
 
        // position search input.
        this.$searchOptions.css({
            'left': center - (this.$searchOptions.outerWidth() / 2)
        });

        // position search pager controls.
        this.$searchPagerControls.css({
            'left': center - (this.$searchPagerControls.width() / 2)
        });
    }
}
