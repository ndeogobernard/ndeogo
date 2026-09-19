document.addEventListener("DOMContentLoaded", function() {
  const modal = document.getElementById("image-lightbox-modal");
  const modalImg = document.getElementById("lightbox-modal-img");
  const captionText = document.getElementById("lightbox-caption");
  const closeBtn = document.getElementById("lightbox-close-btn");

  // Intercept clicks on visualization links
  document.querySelectorAll('a[href*="/assets/visualizations/"]').forEach(anchor => {
    anchor.addEventListener("click", function(e) {
      e.preventDefault();
      const imgSrc = this.getAttribute("href");
      const imgTag = this.querySelector("img");
      const caption = imgTag ? imgTag.getAttribute("alt") : "";

      modalImg.src = imgSrc;
      captionText.innerText = caption;
      modal.style.display = "flex";
      document.body.style.overflow = "hidden"; // Prevent scrolling behind modal
    });
  });

  function closeModal() {
    modal.style.display = "none";
    modalImg.src = "";
    document.body.style.overflow = "auto";
  }

  closeBtn.addEventListener("click", closeModal);
  modal.addEventListener("click", function(e) {
    if (e.target === modal || e.target === modalImg) {
      closeModal();
    }
  });

  document.addEventListener("keydown", function(e) {
    if (e.key === "Escape" && modal.style.display === "flex") {
      closeModal();
    }
  });
});
