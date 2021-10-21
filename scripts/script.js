let addGroupButton = document.querySelector("#add-group-button");
let groupsList = document.querySelector(".groups");
let tasksList = document.querySelector("#todo-list");

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
            // Create a list iteand append it inside the list
            const listItem = document.createElement('li');
            groupsList.appendChild(listItem);
        
            // Put the data from the cursor inside the item
            listItem.textContent = cursor.value.group;

            // Store the ID of the data item inside an attribute on the listItem, so we know
            // which item it corresponds to. This will be useful later when we want to delete items
            listItem.setAttribute('data-note-id', cursor.value.id);
        
            // Create a button and place it inside each listItem
            const deleteBtn = document.createElement('button');
            listItem.appendChild(deleteBtn);
            deleteBtn.textContent = 'Delete';
    
            // Set an event handler so that when the button is clicked, the deleteItem()
            // function is run
            deleteBtn.onclick = deleteGroup;
    
            // Iterate to the next item in the cursor
            cursor.continue();
        } 
        else {
            // Again, if list item is empty, display a 'No notes stored' message
            if(!groupsList.firstChild) {
                const listItem = document.createElement('li');
                listItem.textContent = 'No Groups';
                groupsList.appendChild(listItem);
            }
            // if there are no more cursor items to iterate through, say so
            console.log('Notes all displayed');
        }
    };
}

function deleteGroup(e) {
    // retrieve the name of the group we want to delete. We need
    // to convert it to a number before trying it use it with IDB; IDB key
    // values are type-sensitive.
    let groupId = Number(e.target.parentNode.getAttribute('data-note-id'));

    // open a database transaction and delete the group, finding it using the id we retrieved above
    let transaction = db.transaction(['TodoApp_os'], 'readwrite');
    let objectStore = transaction.objectStore('TodoApp_os');
    let request = objectStore.delete(groupId);

    // report that the data item has been deleted
    transaction.oncomplete = function() {
        // delete the parent of the button
        // which is the list item, so it is no longer displayed
        e.target.parentNode.parentNode.removeChild(e.target.parentNode);
        console.log('Note ' + groupId + ' deleted.');

        // Again, if list item is empty, display a 'No notes stored' message
        if(!groupsList.firstChild) {
            let listItem = document.createElement('li');
            listItem.textContent = 'No Groups';
            groupsList.appendChild(listItem);
        }
    };
}

function addGroup() {
    let groupName = prompt("Group name:");
    let group = document.createElement("li");
    group.textContent = groupName;
    groupsList.appendChild(group);

    // add item to db
    let newItem = {group: groupName, tasks: 'none'};
    
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

addGroupButton.addEventListener('click', addGroup);

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
    
    addGroupButton.removeAttribute('disabled');
    document.addEventListener('keypress', handleShortcuts);
}

function handleShortcuts(e) {
    if (e.key == "a") {
        addGroup();
    }
}

