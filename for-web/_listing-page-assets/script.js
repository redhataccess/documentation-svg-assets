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

    // Setup full size image
    const $modalPreviewImage = document.createElement('img');
    $modalPreviewImage.setAttribute('alt', '');
    $modalPreviewImage.classList.add('modal__preview');

    // Setup close button
    const $modalClose = document.createElement('button');
    $modalClose.classList.add('modal__close');
    $modalClose.innerHTML = 'Close';

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
    $modal.append($modalClose, $modalPreviewImage);
    document.querySelector('body').append($modal);

    // Add lightbox behavior to preview images
    $previewImages.forEach(($previewImage) => {
      $previewImage.addEventListener('click', () => {
        $modalPreviewImage.src = $previewImage.dataset.src;
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

  window.addEventListener('DOMContentLoaded', () => {
    initImageLazyLoading();
    setupModal();
  });
})();
