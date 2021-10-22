let addGroupButton = document.querySelector("#add-group-button");
let addTaskButton = document.querySelector("#add-task-button");
let groupsList = document.querySelector(".groups");
let tasksList = document.querySelector("#todo-list");

let currentGroupId;
let currentSelectedGroup;

let data = {};

function populateTasks() {

    // first, remove all tasks visible
    while (tasksList.firstChild) {
        tasksList.removeChild(tasksList.firstChild);
    }
    
    let i = 0;
    data[currentGroupId].tasks.forEach(task => {
        
        // create a list item that will contain task
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
        let leftHand = document.createElement('div')
        leftHand.classList.add("task-left-side");

        let rightHand = document.createElement('div')
        rightHand.classList.add("task-right-side");


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

function selectTask(e) {
    let task = e.target;
}

function selectGroup(e) {
    let group = e.target;

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

function createAndAppendGroupListItem(cursor) {

    // Create a list iteand append it inside the list
    const listItem = document.createElement('li');
    listItem.classList.add("group");
    listItem.tabIndex = 0;
    groupsList.appendChild(listItem);

    // Put the data from the cursor inside the item
    listItem.textContent = cursor.value.group;

    // Store the ID of the data item inside an attribute on the listItem, so we know
    // which item it corresponds to. This will be useful later when we want to delete items
    listItem.setAttribute('data-group-id', cursor.value.id);

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

function processData() {

    // empty the contents of the list element each time the display is updated
    while (groupsList.firstChild) {
        groupsList.removeChild(groupsList.firstChild);
    }

    // Open our object store and then get a cursor - which iterates through all the
    // different data items in the store
    let objectStore = db.transaction('TodoApp_os').objectStore('TodoApp_os');

    objectStore.openCursor().onsuccess = function(e) {
        // Get a reference to the cursor
        let cursor = e.target.result;
    
        // If there is still another data item to iterate through, keep running this code
        if(cursor) {
            
            data[cursor.value.id] = {
                name: cursor.value.group,
                tasks: cursor.value.tasks
            };
            
            createAndAppendGroupListItem(cursor);
            
            // Iterate to the next item in the cursor
            cursor.continue();
        } 
        else {
            // Again, if list item is empty, display a 'No groups stored' message
            if(!groupsList.firstChild) {
                const listItem = document.createElement('li');
                listItem.textContent = 'No Groups';
                groupsList.appendChild(listItem);
            }
            // if there are no more cursor items to iterate through, say so
            console.log('All groups displayed');
        }
    };
}

function deleteGroup(e) {

    // We don't want to select a group that's being deleted 
    e.stopPropagation();

    // retrieve the name of the group we want to delete. We need
    // to convert it to a number before trying it use it with IDB; IDB key
    // values are type-sensitive.
    let groupId = Number(e.target.parentNode.getAttribute('data-group-id'));

    // open a database transaction and delete the group, finding it using the id we retrieved above
    let transaction = db.transaction(['TodoApp_os'], 'readwrite');
    let objectStore = transaction.objectStore('TodoApp_os');
    let request = objectStore.delete(groupId);

    // report that the data item has been deleted
    transaction.oncomplete = function() {
        // delete the parent of the button
        // which is the list item, so it is no longer displayed
        e.target.parentNode.parentNode.removeChild(e.target.parentNode);
        delete data[groupId];
        console.log('Group ' + groupId + ' deleted.');

        // Again, if list item is empty, display a 'No groups stored' message
        if(!groupsList.firstChild) {
            let listItem = document.createElement('li');
            listItem.textContent = 'No Groups';
            groupsList.appendChild(listItem);
        }
    };
}

function addGroup() {
    let groupName = prompt("Group name:");

    // if user clicks cancel, abort creation
    if (groupName === null) {
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

        // update the display of data to show the newly added item, by running displayData() again.
        processData();
    };

    transaction.onerror = function() {
        console.log('Transaction not opened due to error');
    };
}

function deleteTask(e) {

    // We don't want to select a task that's being deleted 
    e.stopPropagation();
}

function addTask() {

    if (currentGroupId == null) {
        alert("You must select a group");
        return -1;
    }

    let taskText = prompt("Task:");

    if (taskText === null) {
        return;
    }

    let newTask = {
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
        id: currentGroupId
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
    let request = window.indexedDB.open("TodoApp_db", 1);
    
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
        let objectStore = db.createObjectStore('TodoApp_os', { keyPath: 'id', autoIncrement:true });
    
        // Define what data items the objectStore will contain
        objectStore.createIndex('group', 'group', { unique: false });
        objectStore.createIndex('tasks', 'tasks', { unique: false });
      
        console.log('Database setup complete');
    };
    
    addGroupButton.addEventListener('click', addGroup);
    addTaskButton.addEventListener('click', addTask);
    addGroupButton.removeAttribute('disabled');
    addTaskButton.removeAttribute('disabled');
    document.addEventListener('keydown', handleShortcuts);
}

function handleShortcuts(e) {
    if (e.key == "A") {
        addGroup();
    }
    else if (e.key == "a") {
        addTask();
    }
    else if (e.key == "d") {
        // select delete button if focus on group
        let active = document.activeElement;
        if (active.classList.contains("group")) {
            let delButton = active.querySelector(".delete-btn");
            delButton.focus();
        }
    }
    else if (e.key == "g") {
        first = groupsList.firstElementChild;
        if (first != null) {
            first.focus();
        }
    }
    else if (e.key == "t") {
        first = tasksList.firstElementChild;
        if (first != null) {
            first.focus();
        }
    }
    else if (e.key == "Enter") {
        const active = document.activeElement;
        if (active.classList.contains("group")) {
            let event = {target: active};
            selectGroup(event);
        }
    }
    else if (e.key == " ") {
        const active = document.activeElement;
        if (active.classList.contains("task")) {
            active.querySelector("input").click();
        }
    }
    else if (e.key == "ArrowDown" || e.key == "j") {
        let active = document.activeElement;
        if (active.nextElementSibling) {
            active.nextElementSibling.focus();
        }
    }
    else if (e.key == "ArrowUp" || e.key == "k") {
        let active = document.activeElement;
        if (active.previousElementSibling) {
            active.previousElementSibling.focus();
        }
    }
    else {
        console.log(e);
    }
}