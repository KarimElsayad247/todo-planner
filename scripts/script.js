// Varius DOM elements used for manipulating the dynamic content
const addGroupButton = document.querySelector("#add-group-button");
const addTaskButton = document.querySelector("#add-task-button");
const groupsList = document.querySelector(".groups");
const tasksList = document.querySelector("#todo-list");
const saveDataButton = document.querySelector('#save-data-button')
const loadDataButton = document.querySelector('#load-data-button');
const exportModal = document.querySelector("#export-modal");
const importModal = document.querySelector("#import-modal");
const importConfirmButton = document.querySelector("#import-json-text");
const shortcutsModal = document.querySelector('#shortcuts-modal');
const shortcutsPairsList = document.querySelector("#shortcuts-pairs-list");
const modalCloseButton = document.querySelectorAll(".modal-exit-button");


const MODALS = [exportModal, importModal];
const arrows = ["ArrowDown", "ArrowUp", "ArrowRight", "ArrowLeft"];

// These variables relate to the Group displaying a list of tasks
// at a particular moment
const activeGroupNameBox = document.querySelector("#active-group-name");
let currentGroupId;
let currentSelectedGroup;

let data = {};

function exportJSON() {
    let dataText = JSON.stringify(data);
    exportModal.querySelector(".text-content").textContent = dataText;
    exportModal.classList.toggle("hidden");
}

function importFromJSON() {
    const jsonString = document.querySelector("#data-input").value;

    // if user clicks cancel, abort creation
    if (jsonString == null) {
        return;
    }
    else if (jsonString == "") {
        alert("JSON string can't be empty!");
        return;
    }

    try {
        const object = JSON.parse(jsonString);
        data = object;
    } catch (e) {
        alert("Invalid json object");
        return;
    }
    
    clearAndFillDB();
}

function displayImportModal() {
    importModal.classList.toggle("hidden");
}

// populate tasks should be concerned only with putting tasks in the right spot
function populateTasks() {

    // first, remove all tasks visible
    while (tasksList.firstChild) {
        tasksList.removeChild(tasksList.firstChild);
    }
    
    // display name of active group
    activeGroupNameBox.textContent = data[currentGroupId].name; 

    // unique message when there are no tasks
    if (data[currentGroupId].tasks.length === 0) {
        const listItem = document.createElement('li');
        listItem.textContent = 'No Tasks';
        tasksList.appendChild(listItem);
    }

    let i = 0;
    data[currentGroupId].tasks.forEach(task => {
        
        // create a list item that will contain task
        const { leftHand, input, label, rightHand, deleteBtn, listItem } = createTaskElements(i, task);
        leftHand.appendChild(input);
        leftHand.appendChild(label);
        rightHand.appendChild(deleteBtn);
        listItem.appendChild(leftHand);
        listItem.appendChild(rightHand);
        listItem.addEventListener('click', selectTask);
        tasksList.appendChild(listItem);

        i++;
    });
}

function createTaskElements(i, task) {
    const listItem = document.createElement('li');
    listItem.classList.add("task");
    listItem.tabIndex = 0;
    listItem.setAttribute("task-index", i);

    const taskID = `group-${currentGroupId}-task-${i}`;

    const label = document.createElement('label');
    label.for = taskID;
    label.name = taskID;
    label.textContent = task.text;

    const input = document.createElement('input');
    input.type = "checkbox";
    input.id = taskID;
    input.name = taskID;
    input.tabIndex = -1;
    input.addEventListener('change', (e) => {
        listItem.classList.toggle("finished");
        if (e.target.checked) {
            task.status = "finished";
        }
        else {
            task.status = "unfinished";
        }
        updateTasksInDB();
    });

    if (task.status === "finished") {
        input.setAttribute("checked", "");
        listItem.classList.add("finished");
    }

    // Create a button and place it inside each listItem
    const deleteBtn = document.createElement('button');
    deleteBtn.classList.add("delete-btn");
    deleteBtn.textContent = 'Delete';
    deleteBtn.tabIndex = -1; // I only want to focus on button by shortcut




    // Set an event handler so that when the button is clicked, the deleteItem()
    // function is run
    deleteBtn.onclick = deleteTask;

    // Divs for styling puposes
    const leftHand = document.createElement('div');
    leftHand.classList.add("task-left-side");

    const rightHand = document.createElement('div');
    rightHand.classList.add("task-right-side");
    return { leftHand, input, label, rightHand, deleteBtn, listItem };
}

function selectTask(e) {
    let task = e.target;
}

function selectGroup(e) {
    const group = e.target;

    // do nothing if we're selecting currently selected group
    if (currentSelectedGroup === group) {
        return;
    }

    // case when site is loaded and no group selected initially
    if (currentSelectedGroup != null) {
        currentSelectedGroup.classList.toggle("selected");
    }
    currentGroupId = group.getAttribute('data-group-id');
    currentSelectedGroup = group;
    currentSelectedGroup.classList.toggle("selected");

    // update visible tasks to reflect selected group
    populateTasks();

    console.log("focusing", currentGroupId);
}

// TODO: split function into create function and append function,
// each of which will be called from processData and possibly others
function createAndAppendGroupListItem(groupID, groupName) {

    // Create a list iteand append it inside the list
    const listItem = document.createElement('li');
    listItem.classList.add("group");
    listItem.tabIndex = 0;
    groupsList.appendChild(listItem);

    // Put the data from the cursor inside the item
    listItem.textContent = groupName;

    // Store the ID of the data item inside an attribute on the listItem, so we know
    // which item it corresponds to. This will be useful later when we want to delete items
    listItem.setAttribute('data-group-id', groupID);

    // Create a button and place it inside each listItem
    const deleteBtn = document.createElement('button');
    deleteBtn.classList.add("delete-btn");
    deleteBtn.textContent = 'Delete';
    deleteBtn.tabIndex = -1; // I only want to focus on button by shortcut
    listItem.appendChild(deleteBtn);

    listItem.addEventListener('click', selectGroup);

    // Set an event handler so that when the button is clicked, the deleteItem()
    // function is run
    deleteBtn.onclick = deleteGroup;
}

function createAndAppendTaksListItem() {

}

// TODO: Function should only fill the data dictionary.
// It should not be concerned with populating the groups list.
// All code interacting with groupsList should be moved into a seperate function
function processData() {

    // empty the contents of the list element each time the display is updated
    while (groupsList.firstChild) {
        groupsList.removeChild(groupsList.firstChild);
    }

    data = {};

    // Open our object store and then get a cursor - which iterates through all the
    // different data items in the store
    const objectStore = db.transaction('TodoApp_os').objectStore('TodoApp_os');

    objectStore.openCursor().onsuccess = function(e) {
        // Get a reference to the cursor
        let cursor = e.target.result;
    
        // If there is still another data item to iterate through, keep running this code
        if(cursor) {
            
            data[cursor.value.id] = {
                name: cursor.value.group,
                tasks: cursor.value.tasks
            };
            
            createAndAppendGroupListItem(cursor.value.id, cursor.value.group);
            
            // Iterate to the next item in the cursor
            cursor.continue();
        } 
        else {
            // Again, if list item is empty, display a 'No groups stored' message
            if(!groupsList.firstChild) {
                const listItem = document.createElement('li');
                listItem.classList.add('no-groups-message')
                listItem.textContent = "No Groups (press '?' to view all shortcuts)";
                groupsList.appendChild(listItem);
            }
            // if there are no more cursor items to iterate through, say so
            console.log('All groups displayed');
            // select last inserted group
            if(groupsList.lastChild) {
                groupsList.lastChild.click();
            }
        }
    };
}

function deleteGroup(e) {

    // We don't want to select a group that's being deleted 
    e.stopPropagation();

    // confirm if user wants to delete
    let check = confirm("Are you sure you want to delete this group?");

    if (check == false) {
        return;
    }

    // retrieve the name of the group we want to delete. We need
    // to convert it to a number before trying it use it with IDB; IDB key
    // values are type-sensitive.
    let groupId = Number(e.target.parentNode.getAttribute('data-group-id'));

    // open a database transaction and delete the group, finding it using the id we retrieved above
    let transaction = db.transaction(['TodoApp_os'], 'readwrite');
    let objectStore = transaction.objectStore('TodoApp_os');
    let request = objectStore.delete(Number(groupId));

    request.onsuccess = () => {
        console.log("Delete Request with id" + groupId + " success");
    }

    request.onerror = e => {
        console.log(e);
    }

    // report that the data item has been deleted
    transaction.oncomplete = function() {
        // delete the parent of the button
        // which is the list item, so it is no longer displayed
        e.target.parentNode.parentNode.removeChild(e.target.parentNode);
        delete data[groupId];
        console.log('Group ' + groupId + ' deleted.');

        processData();  // TODO: call populateGroups function that will be  
                        // created later. No need to read everything from DB again
    };

    // report if there was an error in transaction
    transaction.onerror = e => {
        console.log(e);
    }
}

function addGroup() {
    let groupName = prompt("Group name:");

    // if user clicks cancel, abort creation
    if (groupName == null) {
        return;
    }
    else if (groupName == "") {
        alert("Group name can't be empty!");
        return;
    }

    // add item to db
    let newItem = {group: groupName, tasks: []};
    
    // open a read/write db transaction, ready for adding the data
    let transaction = db.transaction(['TodoApp_os'], 'readwrite');

    // call an object store that's already been added to the database
    let os = transaction.objectStore('TodoApp_os');

    // Make a request to add our newItem object to the object store
    let request = os.add(newItem);

    // Report on the success of the transaction completing, when everything is done
    transaction.oncomplete = function() {
        console.log('Transaction completed: database modification finished.');

        // TODO:
        // update the display of data to show the newly added item
        // If the intent to display data groupsList modification, then
        // reading from DB again is an absolute waste of time
        // IDEA: reflect newly added group in data dictionary, then 
        processData();
    };

    transaction.onerror = function() {
        console.log('Transaction not opened due to error');
    };
}

function clearAndFillDB() {
    // open a read/write db transaction
    let transaction = db.transaction(['TodoApp_os'], 'readwrite');

    // call an object store that's already been added to the database
    let os = transaction.objectStore('TodoApp_os');

    // Make a request to the object store
    let request = os.clear();

    // Report on the success of the transaction completing, when everything is done
    transaction.oncomplete = function() {
        console.log('Object Store Cleared');
        fillDataBaseFromDataObject();
    };

    transaction.onerror = function() {
        console.log('Transaction not opened due to error');
    };
}

// The intent is to assume data dictionary has been modified elsewhere
function fillDataBaseFromDataObject() {
    let id = 1;
    for (const groupID in data) {
        let group = data[groupID];
        
        // create item that will be put in database;
        const newItem = {
            group: group.name,
            tasks: group.tasks,
            id: id 
        };

        
        // open up a transaction;
        const transaction = db.transaction(['TodoApp_os'], "readwrite");
        
        // call the object store that's already added to the database
        const os = transaction.objectStore('TodoApp_os');
        
        // create a put new item
        const request = os.put(newItem);
        
        request.onsuccess = () => console.log(`Group {id} imported`);
        
        request.onerror = (e) => {
            console.log(`Error importing Group {id}: {group.name}`);
            console.log(e);
        };
        id = id + 1;
    }
    processData();
}

function deleteTask(e) {

    // We don't want to select a task that's being deleted 
    e.stopPropagation();

    // confirm if user wants to delete
    const check = confirm("Are you sure you want to delete this task?");
    
    if (check == false) {
        return;
    }

    // get the task index attribute from parent list item
    const taskIndex = e.target.closest('li').getAttribute("task-index");

    // remove task from array
    data[currentGroupId].tasks.splice(taskIndex, 1);

    populateTasks();

    updateTasksInDB();


}

function addTask() {

    if (currentGroupId == null) {
        alert("You must select a group");
        return -1;
    }

    const taskText = prompt("Task:");

    if (taskText === null) {
        return;
    }

    const newTask = {
        text: taskText,
        status: "unfinished"
    };

    // add new task to global data object
    data[currentGroupId].tasks.push(newTask);

    // update the DB to reflect addition of new task
    updateTasksInDB();

    // update tasks list to reflect newly added task
    populateTasks();

}

function updateTasksInDB() {
    
    // create item that will be put in database
    const newItem = {
        group: data[currentGroupId].name,
        tasks: data[currentGroupId].tasks,
        id: Number(currentGroupId)
    }

    // open up a transaction 
    const transaction = db.transaction(['TodoApp_os'], "readwrite");

    // call the object store that's already added to the database
    const os = transaction.objectStore('TodoApp_os');

    // create a put request to update associated group
    const updateTasksRequest = os.put(newItem);

    updateTasksRequest.onsuccess = () => console.log("Updated tasks in database successfully");

    updateTasksRequest.onerror = (e) => {
        console.log("Error updating tasks in database");
        console.log(e);
    } 
}

// store the database object
let db;

window.onload = () =>  {
    const request = window.indexedDB.open("TodoApp_db", 1);
    
    // onerror handler signifies that the database didn't open successfully
    request.onerror = function() {
        console.log('Database failed to open');
    };

    request.onsuccess = () => {
        console.log("Database opened successfully");
        
        // Store the opened database object in the db variable. This is used a lot below
        db = request.result;

        processData();
    }

    // Setup the database tables if this has not already been done
    request.onupgradeneeded = function(e) {
        // Grab a reference to the opened database
        let db = e.target.result;
    
        // Create an objectStore to store our gorups in
        // including a auto-incrementing key
        const objectStore = db.createObjectStore('TodoApp_os', { keyPath: 'id', autoIncrement:true });
    
        // Define what data items the objectStore will contain
        objectStore.createIndex('group', 'group', { unique: false });
        objectStore.createIndex('tasks', 'tasks', { unique: false });
      
        console.log('Database setup complete');
    };
    
    populateShortcutsModal();
    registerEventListeners();


    modalCloseButton.forEach(button => {
        button.onclick = e => {
            // hide the modal by changin display prop to none
            e.target.parentElement.parentElement.classList.toggle("hidden");
        }
    })

}

function populateShortcutsModal() {
    for (const shortcut in shortcuts) {
        const listItem = document.createElement("li");
        listItem.classList.add("shortcut-list-item");
        const key = document.createElement("code");
        key.classList.add("shortcut-key");
        key.textContent = shortcuts[shortcut].key;
        const description = document.createElement("p");
        description.classList.add("shortcut-description");
        description.textContent = shortcuts[shortcut].description;
        listItem.appendChild(key);
        listItem.appendChild(description);
        shortcutsPairsList.appendChild(listItem);
        // console.log(`${key.textContent}: ${description.textContent}`)
    }
}

function registerEventListeners() {
    addGroupButton.addEventListener('click', addGroup);
    addTaskButton.addEventListener('click', addTask);
    addGroupButton.removeAttribute('disabled');
    addTaskButton.removeAttribute('disabled');
    saveDataButton.addEventListener('click', exportJSON);
    loadDataButton.addEventListener('click', displayImportModal);   
    importConfirmButton.addEventListener('click', importFromJSON);
    document.addEventListener('keydown', handleShortcuts);
}

// These constants mark the default shortcuts configuration. 
const ADD_GROUP_KEY = "A";
const ADD_TASK_KEY = "a";
const FOCUS_DELETE = "d";
const FOCUS_GROUPS = "g";
const FOCUS_TASKS = "t";
const SELECT = "Enter";
const CHECK = " ";
const LIST_DOWN = "j";
const LIST_UP = "k";
const TOGGLE_SIDEBAR = "e";
const TOGGLE_SHORTCUTS_MODAL = "?";

let shortcuts = {
    "ADD_GROUP_KEY": {"key": ADD_GROUP_KEY, "description": "Add a new Group"},
    "ADD_TASK_KEY": {"key": ADD_TASK_KEY, "description": "Add a new task"},
    "FOCUS_DELETE": {"key": FOCUS_DELETE, "description": "Focus on delete button in selected element"},
    "FOCUS_GROUPS": {"key": FOCUS_GROUPS, "description": "Focus on current group in groups list"},
    "FOCUS_TASKS": {"key": FOCUS_TASKS, "description": "Focus on first task in tasks list"},
    "SELECT": {"key": SELECT, "description": "Switch to focused group"},
    "CHECK": {"key": CHECK, "description": "toggle status of focused task (Finished/Unfinished)"},
    "LIST_DOWN": {"key": LIST_DOWN, "description": "Focus on next element in a list (Task/Group)"},
    "LIST_UP": {"key": LIST_UP, "description": "Focus on previous element in a list (Task/Group)"},
    "TOGGLE_SIDEBAR": {"key": TOGGLE_SIDEBAR, "description": "Toggle sidebar visibility"},
    "TOGGLE_SHORTCUTS_MODAL": {"key": TOGGLE_SHORTCUTS_MODAL, "description": "View/Hide this help"},
}

function handleShortcuts(e) {
    
    // In order not to intercetp input directed at text boxes for example
    if (isModal(e.target)) {
        // handleModalShortcuts(e);
        return
    }

    if (e.key in shortcuts || isArrow(e.key)) e.preventDefault();
    if (e.keyCode == 32) e.preventDefault();

    if (e.key == shortcuts.ADD_GROUP_KEY.key) {
        addGroup();
    }
    else if (e.key == shortcuts.ADD_TASK_KEY.key) {
        addTask();
    }
    else if (e.key == shortcuts.FOCUS_DELETE.key) {
        // select delete button if focus on group
        let active = document.activeElement;
        if (active.classList.contains("group")) {
            let delButton = active.querySelector(".delete-btn");
            delButton.focus();
        }
        else if (active.classList.contains("task")) {
            let delButton = active.querySelector(".delete-btn");
            delButton.focus();   
        }
    }
    else if (e.key == shortcuts.FOCUS_GROUPS.key) {
        let currentGroupElement = document.querySelector(`[data-group-id="${currentGroupId}"]`)
        if (currentGroupElement) {
            currentGroupElement.focus()
        }
        else {
            let first = groupsList.firstElementChild;
            if (first != null) {
                first.focus();
            }
        }
    }
    else if (e.key == shortcuts.FOCUS_TASKS.key) {
        let first = tasksList.firstElementChild;
        if (first != null) {
            first.focus();
        }
    }
    else if (e.key == shortcuts.TOGGLE_SIDEBAR.key) {
        let sidebar = document.querySelector(".side-bar");
        sidebar.classList.toggle("hidden"); 
    }
    else if (e.key == shortcuts.TOGGLE_SHORTCUTS_MODAL.key) {
        toggleShortcutsModal();
    }
    else if (e.key == shortcuts.SELECT.key) {
        const active = document.activeElement;
        if (active.classList.contains("group")) {
            let event = {target: active};
            selectGroup(event);
        }
    }
    else if (e.key == shortcuts.CHECK.key) {
        const active = document.activeElement;
        if (active.classList.contains("task")) {
            active.querySelector("input").click();
        }
    }
    else if (e.key == "ArrowDown" || e.key == shortcuts.LIST_DOWN.key) {
        let active = document.activeElement;
        if (active.nextElementSibling) {
            active.nextElementSibling.focus();
        }
        else {
            active.parentElement.firstElementChild.focus();
        }
    }
    else if (e.key == "ArrowUp" || e.key == shortcuts.LIST_UP.key) {
        let active = document.activeElement;
        if (active.previousElementSibling) {
            active.previousElementSibling.focus();
        }
        else {
            active.parentElement.lastElementChild.focus();
        }
    }
    else {
        console.log(e);
    }
}

function handleModalShortcuts(e) {
    
}

function isModal(element) {
    MODALS.forEach( modal => {
        if (modal.contains(element)) return true;
    })
    return false;
}

function isArrow(key) {
    if (arrows.includes(key)) return true;
    return false;
}

function toggleShortcutsModal() {
    shortcutsModal.classList.toggle("hidden");
}