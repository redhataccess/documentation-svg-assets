/**
 * @file
 * Diagram landing page JS
 */
'use strict';

// Avoid polluting the global scope
(() => {
  
  
  const initImageLazyLoading = () => {
    // Lazy load images since we're likely to have a ton on one page
    const $lazyLoadedImages = document.querySelectorAll('.js-lazy-load');
    // Setup behavior when image is on screen
    const lazyImageObserver = new IntersectionObserver(function(entries) {
      entries.forEach(function(entry) {
        if (entry.isIntersecting) {
          const $lazyImage = entry.target;
          // Move the data-src attribute value to src to load the image
          $lazyImage.src = $lazyImage.dataset.src;
          $lazyImage.classList.remove("js-lazy-load");
          lazyImageObserver.unobserve($lazyImage);
        }
      });
    });

    // Apply the behavior to each image
    $lazyLoadedImages.forEach(function($image) {
      lazyImageObserver.observe($image);
    });
  }

  // Adds markup and behaviors necessary for modal
  const setupModal = () => {
    const $previewImages = document.querySelectorAll('.preview-image');
    const $modal = document.createElement('dialog');
    
    // Setup context warning twice so that nobody has an excuse that they didn't see it.
    const $warning = document.createElement('p');
    $warning.innerHTML = 'Please do not use this graphic out of context.'
    const $warning2 = document.createElement('p');
    $warning2.innerHTML = 'Please do not use this graphic out of context.'

    // Setup full size image
    const $modalPreviewImage = document.createElement('img');
    $modalPreviewImage.setAttribute('alt', '');
    $modalPreviewImage.classList.add('modal__preview');

    // Setup close button
    const $modalClose = document.createElement('button');
    $modalClose.classList.add('modal__close');
    $modalClose.innerHTML = 'Close';

    // Setup download button
    const $imageDownload = document.createElement('a');
    $imageDownload.classList.add('image-download');
    $imageDownload.innerHTML = 'Download Image';
    // $imageDownload.setAttribute('download', true);

    /**
     * Utility function to close modal and cleanup
     */
    const closeModal = () => {
      $modal.close();
      $modalPreviewImage.src = '';
    }

    $modalClose.addEventListener('click', () => {
      closeModal();
    });

    // Add everything to the DOM
    $modal.append($modalClose, $warning, $modalPreviewImage, $warning2, $imageDownload);
    document.querySelector('body').append($modal);

    // Add lightbox behavior to preview images
    $previewImages.forEach(($previewImage) => {
      $previewImage.addEventListener('click', () => {
        // Set the source for the modal image
        $modalPreviewImage.src = $previewImage.dataset.src;
        // Set the path for the download link 
        $imageDownload.setAttribute('href', $previewImage.dataset.src);
        // pull apart the path to get the filename
        const previewImageFilename = $previewImage.dataset.src.split('/').slice(-1).pop();
        // remove the file extension
        const previewImageTitle = previewImageFilename.split('.')[0];
        // add the download attribute to the download link with the filename as the value so that when the user downloads the image, it has the right name
        $imageDownload.setAttribute('download', previewImageTitle);
        $modal.showModal();
      });
      $previewImage.classList.add('preview-image--processed');
    });

    // When the backdrop is clicked, close the modal
    // ::backdrop is a pseudo element inside of modal,
    // so any click on the backdrop or in the modal area will go to the modal
    $modal.addEventListener('click', (event) => {
      // Get coordinates of modal area
      const modalRect = $modal.getBoundingClientRect();
      // Compare click location with modal area
      const clickedInModal = (
        modalRect.top <= event.clientY
        && event.clientY <= modalRect.top + modalRect.height
        && modalRect.left <= event.clientX
        && event.clientX <= modalRect.left + modalRect.width
      );
      if (!clickedInModal) {
        $modal.close();
      }
    });
  };


  
  /**
   * Handle keyboard input specifically for the esc key
   * @param {$control} element button or other element used to trigger the expander
   * @param {$dropdown} element container that will show and hide
   * @param {options} object additional options used for the expander such as globallyCancelable (boolean) to use the escape key to close the expander
   */
   class ContentExpander {
    constructor ($control, $dropdown, options) {
      this.open = this.open.bind(this);
      this.close = this.close.bind(this);
      this.toggle = this.toggle.bind(this);
      this.handleClickAway = this.handleClickAway.bind(this);
      this.handleEscPress = this.handleEscPress.bind(this);
      this.control = $control;
      this.dropdown = $dropdown;
      this.options = options ? options : {};
      const id = `content-expander-${Math.random().toString(36).substring(2, 9)}`;
      // if no id in the element, create one
      if (!this.dropdown.id) {
        this.dropdown.id = id;
      }
      this.control.setAttribute('aria-expanded','false');
      this.dropdown.setAttribute('aria-hidden', 'true');
      // make sure the aria-controls attribute matches the id of the element controlling it
      this.control.setAttribute('aria-controls', this.dropdown.id);
      this.control.addEventListener('click', this.toggle);
      if (this.options.globallyCancelable) {
        window.addEventListener('keydown', this.handleEscPress);
      }
    }

    handleClickAway(event) {
      let target = event.target;
      if (typeof target.closest === 'function') {
        // find if click target was a target of the component and if it's not, close the menu
        let trigger = target.closest('.content-expander__trigger')
        let expander = target.closest('.content-expander')
        if (!trigger && !expander) {
          this.close();
        }
      }
    }

    open() {
      this.control.setAttribute('aria-expanded','true');
      this.dropdown.setAttribute('open','');
      this.dropdown.removeAttribute('aria-hidden');
      window.addEventListener('click', this.handleClickAway);
      window.addEventListener('keyup', this.handleEscPress);
    }
  
    close() {
      this.control.setAttribute('aria-expanded','false');
      this.dropdown.removeAttribute('open');
      this.dropdown.setAttribute('aria-hidden','true');
      window.removeEventListener('keyup', this.handleClickAway);
      window.removeEventListener('keyup', this.handleEscPress);
    }
  
    toggle() {
      if (this.dropdown.hasAttribute('open')) {
        this.close();
      }
      else {
        this.open();
      }
    }
  
    /**
     * Handle keyboard input specifically for the esc key
     * @param {object} event Event object from event listener
     */
    handleEscPress(event) {
      // console.log(event);
      if (event.defaultPrevented) {
        return; // Do nothing if the event was already processed
      }
      switch (event.key) {
        case 'Esc': // IE/Edge specific value
        case 'Escape':
          // use the tabletBreakpoint  check to see if the page is on mobile/tablet
          // and run the function to collapse the TOC if it's open
          this.close();
          break;
        default:
          return; // Quit when this doesn't handle the key event.
      }
      // Cancel the default action to avoid it being handled twice
      event.preventDefault();
    }
  }  


  const setupExpanders = () =>{
    const $expanders = document.querySelectorAll('.content-expander');
    if ($expanders.length > 0) {
      for (let i = 0; i < $expanders.length; i++) {
        const $expander = $expanders[i];
        const $expanderTrigger = $expander.previousElementSibling;
        $expanderTrigger.expander = new ContentExpander($expanderTrigger, $expander);
        // $expanderTrigger.addEventListener('click', () => {
        //   console.log("clicked");
        //     // if the product listing is toggled open, set the menu listeners
        //     if ($expanderTrigger.hasAttribute('aria-expanded') && $expanderTrigger.getAttribute('aria-expanded') === 'true') {
        //       productMenuOpened();
        //     }
        //     // if the product listing is toggled closed, remove the menu listeners so they're not hanging around
        //     else {
        //       productMenuClosed();
        //     }
          
        // });
      }
    }
  }


  window.addEventListener('DOMContentLoaded', () => {
    initImageLazyLoading();
    setupModal();
    setupExpanders();
  });
})();
