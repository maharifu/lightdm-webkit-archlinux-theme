var am_pm = false; // Change to false for 24H clock format!

var time_remaining = 0;
var selected_user = null;
var valid_image = /.*\.(png|svg|jpg|jpeg|bmp)$/i;

///////////////////////////////////////////////
// CALLBACK API. Called by the webkit greeeter
///////////////////////////////////////////////

// called when the greeter asks to show a login prompt for a user
function show_prompt(text) {
  var password_container = document.querySelector("#password_container");
  var password_entry = document.querySelector("#password_entry");
  if (!isVisible(password_container)) {
    var users = document.querySelectorAll(".user");
    var user_node = document.querySelector("#"+selected_user);
    var rect = user_node.getClientRects()[0];
    var parentRect = user_node.parentElement.getClientRects()[0];
    var center = parentRect.width/2;
    var left = center - rect.width/2 - rect.left;
    var i = 0;
    if (left < 5 && left > -5) {
      left = 0;
    }
    for (i = 0; i < users.length; i++) {
      var node = users[i];
      setVisible(node, node.id === selected_user);
      node.style.left= left;
    }

    setVisible(password_container, true);
    password_entry.placeholder= text.replace(":", "");
  }
  password_entry.value= "";
  password_entry.focus();
}

// called when the greeter asks to show a message
function show_message(text) {
  var message = document.querySelector("#message_content");
  message.innerHTML= text;
  if (text) {
    document.querySelector("#message").classList.remove("hidden");
  } else {
    document.querySelector("#message").classList.add("hidden");
  }
  message.classList.remove("error");
}

// called when the greeter asks to show an error
function show_error(text) {
  show_message(text);
  var message = document.querySelector("#message_content");
  message.classList.add("error");
}

// called when the greeter is finished the authentication request
function authentication_complete() {
  if (lightdm.is_authenticated) {
    lightdm.login(lightdm.authentication_user, lightdm.default_session);
  } else {
    show_error("Authentication Failed");
    start_authentication(selected_user);
  }
}

// called when the greeter wants us to perform a timed login
function timed_login(user) {
  lightdm.login (lightdm.timed_login_user);
  //setTimeout('throbber()', 1000);
}

//////////////////////////////
// Implementation
//////////////////////////////
function start_authentication(username) {
  lightdm.cancel_timed_login();
  selected_user = username;
  lightdm.start_authentication(username);
}

function provide_secret() {
  show_message("Logging in...");
  entry = document.querySelector('#password_entry');
  lightdm.provide_secret(entry.value);
}

function initialize_sessions() {
  var template = document.querySelector("#session_template");
  var container = session_template.parentElement;
  var i = 0;
  container.removeChild(template);

  for (i = 0; i < lightdm.sessions.length; i = i + 1) {
    var session = lightdm.sessions[i];
    var s = template.cloneNode(true);
    s.id = "session_" + session.key;

    var label = s.querySelector(".session_label");
    var radio = s.querySelector("input");

    console.log(s, session);
    label.innerHTML = session.name;
    radio.value = session.key;

    if (session.key === lightdm.default_session.key) {
      radio.checked = true;
    }

    session_container.appendChild(s);
  }
}

function show_users() {
  var users = document.querySelectorAll(".user");
  var i = 0;
  for (i= 0; i < users.length; i++) {
    setVisible(users[i], true);
    users[i].style.left = 0;
  }
  setVisible(document.querySelector("#password_container"), false);
  selected_user = null;
}

function user_clicked(event) {
  var user_id = event.currentTarget.id;
  toggle_user(user_id);
  show_message("");
  event.stopPropagation();
  return false;
}

function toggle_user(user_id) {
  if (selected_user !== null) {
    selected_user = null;
    lightdm.cancel_authentication();
    show_users();
  } else {
    selected_user = user_id;
    start_authentication(user_id);
  }
}

function setVisible(element, visible) {
  if (visible) {
    element.classList.remove("hidden");
  } else {
    element.classList.add("hidden");
  }
}

function isVisible(element) {
  return !element.classList.contains("hidden");
}

function update_time() {
  var time = document.querySelector("#current_time");
  var date = new Date();

  var hh = date.getHours();
  var mm = date.getMinutes();
  var ss = date.getSeconds();
  var suffix = "";
  if( am_pm ) {
    var suffix= " AM";
    if (hh > 12) {
      hh = hh - 12;
      suffix = " PM";
    }
  }
  if (hh < 10) { hh = "0"+hh; }
  if (mm < 10) { mm = "0"+mm; }
  if (ss < 10) { ss = "0"+ss; }
  time.innerHTML = hh + ":" + mm + suffix;
}

//////////////////////////////////
// Initialization
//////////////////////////////////

function initialize() {
  show_message("");
  initialize_users();
  initialize_timer();
  //initialize_sessions();
}

function on_image_error(e) {
  e.currentTarget.src = "img/avatar.svg";
}

function initialize_users() {
  var template = document.querySelector("#user_template");
  var parent = template.parentElement;
  parent.removeChild(template);

  for (i = 0; i < lightdm.users.length; i += 1) {
    user = lightdm.users[i];
    userNode = template.cloneNode(true);

    var image = userNode.querySelectorAll(".user_image")[0];
    var name = userNode.querySelectorAll(".user_name")[0];
    name.innerHTML = user.display_name;

    if (user.image) {
      image.src = user.image;
      image.onerror = on_image_error;
    } else {
      image.src = "img/avatar.svg";
    }

    userNode.id = user.name;
    userNode.onclick = user_clicked;
    parent.appendChild(userNode);
  }
  setTimeout(show_users, 400);
}

function initialize_timer() {
  update_time();
  setInterval(update_time, 1000);
}

function add_action(id, name, image, clickhandler, template, parent) {
  action_node = template.cloneNode(true);
  action_node.id = "action_" + id;
  img_node = action_node.querySelectorAll(".action_image")[0];
  label_node = action_node.querySelectorAll(".action_label")[0];
  label_node.innerHTML = name;
  img_node.src = image;
  action_node.onclick = clickhandler;
  parent.appendChild(action_node);
}

document.onkeydown = function(evt) {
  evt = evt || window.event;
  if (selected_user === null && evt.keyCode === 13 || // Enter
      selected_user !== null && evt.keyCode === 27) { // ESC
    var active = document.querySelector(".user_image_wrapper.active");
    if(active === null) {
      var user_id = document.querySelector(".user").id;
    } else {
      var user_id = active.parentNode.id;
      active.className = active.className.replace(' active','');
    }
    toggle_user(user_id);
    evt.stopPropagation();
    return false;
  }

  // Select user with Left/Right arrow keys
  if((evt.keyCode === 37 || evt.keyCode == 39) && selected_user === null) {
    var users = document.querySelectorAll(".user_image_wrapper");
    var activate = null;
    var active = null;
    var i;
    for( i=0 ; i < users.length ; ++i ) {
      if( evt.keyCode === 37 ) { // Left
        var user = users[users.length - i - 1];
      } else { // Right
        var user = users[i];
      }
      if( activate === null ) {
        activate = user;
      }
      if((' ' + user.className + ' ').indexOf(' active ') > -1) {
        activate = null;
        active = user;
      }
    }
    if( activate !== null) {
      if( active !== null ) {
        active.className = active.className.replace(' active','');
      }
      activate.className += " active";
    }
    evt.stopPropagation();
    return false;
  }
}

