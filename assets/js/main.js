document.addEventListener('DOMContentLoaded', function(){
  const rsvp = document.querySelector('.rsvp');
  if(rsvp){
    rsvp.addEventListener('click', function(e){
      e.preventDefault();
      const target = document.querySelector(this.getAttribute('href'));
      if(target) target.scrollIntoView({behavior:'smooth'});
    })
  }
});
