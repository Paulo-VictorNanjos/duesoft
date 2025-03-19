$('.lesson-item').on('click', function() {
    console.log('Lesson clicked');
    console.log('This element:', $(this));
    
    const videoUrl = $(this).data('video-url');
    console.log('Video URL:', videoUrl);
    
    const lessonTitle = $(this).find('.lesson-title').text();
    console.log('Lesson title:', lessonTitle);
    
    const videoModal = $('#videoModal');
    console.log('Video modal element:', videoModal);
    
    // Update modal content
    videoModal.find('.modal-title').text(lessonTitle);
    const videoContainer = videoModal.find('.video-container');
    console.log('Video container:', videoContainer);
    
    // Clear previous video if any
    videoContainer.empty();
    
    // Add new video iframe
    const videoIframe = $('<iframe>', {
        src: videoUrl,
        frameborder: '0',
        allowfullscreen: true,
        width: '100%',
        height: '400px'
    });
    console.log('Created video iframe:', videoIframe);
    
    videoContainer.append(videoIframe);
    
    // Show modal
    videoModal.modal('show');
}); 