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

  window.addEventListener('DOMContentLoaded', () => {
    initImageLazyLoading();

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
     * Close modal and cleanup
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

    $modal.addEventListener('click', (event) => {
      const modalRect = $modal.getBoundingClientRect();
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
  });
})();
