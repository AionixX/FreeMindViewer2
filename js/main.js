var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var FreeMindViewer;
(function (FreeMindViewer) {
    window.addEventListener("load", init);
    let params;
    let canvas;
    let ctx;
    let focusedNode;
    let states = [];
    let mindmapData;
    let docNode; // document node is the first node in a xml file
    let rootNode; // first actual node of the mindmap
    let root;
    let fmvNodes;
    let allFolded = false;
    let currentLevel = 0;
    let activeTextField = null;
    function init() {
        fmvNodes = [];
        params = getUrlSearchJson();
        if (FreeMindViewer.getCookie("at"))
            FreeMindViewer.login();
        else if (params.code && params.state)
            FreeMindViewer.fetchAccesstokenAndLogin(params.code, params.state);
        if (params.path == undefined || params.path == "") {
            params.path = "./mm";
            params.map = "README.mm";
            params.list = "false";
        }
        fetchXML();
        window.addEventListener("resize", resizecanvas, false);
        FreeMindViewer.loginButton = document.querySelector("#loginOutbutton");
        FreeMindViewer.loginSpan = document.querySelector("#userName");
        FreeMindViewer.loginButton.addEventListener("click", FreeMindViewer.authorize);
        document.querySelector("#fetchFileButton").addEventListener("click", FreeMindViewer.fetchFile);
        document.querySelector("#saveFileButton").addEventListener("click", uploadFile);
    }
    function uploadFile() {
        mindmapData = createXMLFile();
        createMindmap();
        FreeMindViewer.saveFile(XMLToString(mindmapData));
    }
    function XMLToString(_data) {
        return new XMLSerializer().serializeToString(_data.documentElement);
    }
    function loadData() {
        return __awaiter(this, void 0, void 0, function* () {
            docNode = mindmapData.documentElement;
            rootNode = docNode.firstElementChild;
            if (params.list == "true") {
                //createList();
            }
            else if (params.list == "false" || !params.list) {
                createCanvas();
                createMindmap();
                // Little hack -> change side 2 times so every node has a POSITION attribute
                root.children.forEach(child => {
                    child.changeSide();
                    child.changeSide();
                });
            }
            console.log("end load data");
        });
    }
    function fetchXML(_path) {
        return __awaiter(this, void 0, void 0, function* () {
            let response = null;
            console.log(_path);
            if (_path == "" || !_path)
                response = yield fetch(params.path + "/" + params.map);
            else
                response = yield fetch(_path);
            //const xmlText: string = _path ? _path : await response.text();
            const xmlText = yield response.text();
            mindmapData = StringToXML(xmlText); // Save xml in letiable
            loadData();
            saveState();
        });
    }
    FreeMindViewer.fetchXML = fetchXML;
    // parses a string to XML
    function StringToXML(xString) {
        return new DOMParser().parseFromString(xString, "text/xml");
    }
    function createCanvas() {
        canvas = document.getElementsByTagName("canvas")[0];
        canvas.setAttribute("height", "window.innerHeight");
        canvas.setAttribute("width", "window.innerWidth");
        ctx = canvas.getContext("2d");
        // match Canvas dimensions to browser window
        ctx.canvas.width = window.innerWidth;
        ctx.canvas.height = window.innerHeight;
        // determine the center of the canvas
        FreeMindViewer.rootNodeX = ctx.canvas.width / 2;
        FreeMindViewer.rootNodeY = ctx.canvas.height / 2;
        // Eventlistener for draggable canvas
        canvas.addEventListener("mousemove", onPointerMove);
        canvas.addEventListener("mousedown", onMouseDown);
        canvas.addEventListener("mouseup", onMouseUp);
        window.addEventListener("keydown", keyboardInput);
    }
    function resizecanvas() {
        createCanvas();
        root.drawFMVNode();
    }
    function createMindmap() {
        clearMap();
        mindmapData = createXMLFile();
        fmvNodes.length = 0;
        // create root FMVNode
        root = new FreeMindViewer.FMVRootNode(ctx, rootNode.getAttribute("TEXT"));
        fmvNodes.push(root);
        root.node = rootNode;
        // Use root FMVNode as starting point and create all subFMVNodes
        createFMVNodes(rootNode, root);
        root.calculateVisibleChildren();
        root.setPosition(0);
        root.drawFMVNode();
    }
    function createFMVNodes(rootNode, parentFMVNode) {
        let id = rootNode.getAttribute("ID");
        if (!id) {
            rootNode.setAttribute("ID", createID());
        }
        // only continue if current root has children
        if (rootNode.hasChildNodes()) {
            let children = getChildElements(rootNode);
            // FMVNodes array used for sibling relations
            let childFMVNodes = new Array();
            for (let i = 0; i < children.length; i++) {
                // use only children with rootNode as parent
                if (children[i].parentElement == rootNode) {
                    let fmvNodeContent = children[i].getAttribute("TEXT");
                    let fmvNodeMapPosition = children[i].getAttribute("POSITION");
                    if (fmvNodeMapPosition == null) {
                        fmvNodeMapPosition = parentFMVNode.mapPosition;
                    }
                    let fmvNodeFolded = children[i].getAttribute("FOLDED");
                    let fmvNodeFoldedBool = fmvNodeFolded == "true" ? true : false;
                    let fmvNode = new FreeMindViewer.FMVNode(parentFMVNode, ctx, fmvNodeContent, fmvNodeMapPosition, fmvNodeFoldedBool);
                    fmvNode.node = children[i];
                    childFMVNodes.push(fmvNode);
                    fmvNodes.push(fmvNode);
                    parentFMVNode.children = childFMVNodes;
                    // do it all again for all the children of rootNode
                    createFMVNodes(children[i], fmvNode);
                }
            }
        }
        else {
            return;
        }
    }
    function getChildElements(parent) {
        let childElementsCollection;
        let childElements = new Array();
        // get all children of parent as Element collection. Gets ALL children!
        childElementsCollection = parent.getElementsByTagName("node");
        for (let i = 0; i < childElementsCollection.length; i++) {
            if (childElementsCollection[i].parentElement == parent) {
                // save only the children with correct parent element
                childElements.push(childElementsCollection[i]);
            }
        }
        return childElements;
    }
    function redrawWithoutChildren() {
        clearMap();
        root.setPosition(0);
        root.drawFMVNode();
    }
    function keyboardInput(_event) {
        //console.log(_event);
        switch (_event.code) {
            case "Space":
                if (_event.ctrlKey) {
                    root.children.forEach(child => {
                        foldNode(child, true, allFolded);
                    });
                    allFolded = !allFolded;
                    createMindmap();
                    return;
                }
                if (focusedNode) {
                    let id = focusedNode.node.getAttribute("ID");
                    foldNode(focusedNode, false);
                    createMindmap();
                    focusNode(findNodeByID(id));
                    return;
                }
                if (document.activeElement.nodeName.toLowerCase() != "input" && !focusedNode) {
                    // prevent default spacebar event (scrolling to bottom)
                    _event.preventDefault();
                    FreeMindViewer.rootNodeX = canvas.width / 2;
                    FreeMindViewer.rootNodeY = canvas.height / 2;
                    redrawWithoutChildren();
                    return;
                }
                break;
            case "F2":
                createTextFieldOnNode();
                break;
            case "ArrowUp":
                if (_event.ctrlKey)
                    changeOrder(1);
                else
                    focusSibling(-1);
                break;
            case "ArrowDown":
                if (_event.ctrlKey)
                    changeOrder(-1);
                else
                    focusSibling(1);
                break;
            case "ArrowLeft":
                if (_event.ctrlKey)
                    setParent(-1);
                else
                    focusParent(-1);
                break;
            case "ArrowRight":
                if (_event.ctrlKey)
                    setParent(1);
                else
                    focusParent(1);
                break;
            case "Enter":
                if (activeTextField)
                    activeTextField.blur();
                else {
                    if (focusedNode && focusedNode != root) {
                        focusNode(focusedNode.parent);
                    }
                    createNewNode();
                }
                break;
            case "Delete":
                deleteNode();
                break;
            case "Insert":
                if (activeTextField)
                    activeTextField.blur();
                else
                    createNewNode();
                break;
            case "Escape":
                if (activeTextField) {
                    activeTextField.value = focusedNode.content;
                    activeTextField.blur();
                }
                else {
                    focusNode(null);
                }
                break;
            case "KeyY":
                if (_event.ctrlKey)
                    loadState();
                break;
        }
    }
    function saveState() {
        states.push(rootNode.cloneNode(true));
        if (states.length >= 100)
            states.shift();
    }
    function loadState() {
        if (states.length <= 0)
            return;
        rootNode = states.pop();
        mindmapData = createXMLFile();
        createMindmap();
        redrawWithoutChildren();
    }
    function createXMLFile() {
        let doc = document.implementation.createDocument(null, "node", null);
        doc.documentElement.appendChild(rootNode);
        return doc;
    }
    function foldNode(_node, _withChildren, _state) {
        _node.node.setAttribute("FOLDED", (_state != null ? _state : !_node.folded) + "");
        if (_withChildren) {
            _node.children.forEach(child => {
                foldNode(child, true, _state);
            });
        }
    }
    function changeOrder(_dir) {
        if (!focusedNode || focusedNode === root)
            return;
        saveState();
        let index = 0;
        let elements = [];
        for (let i = 0; i < focusedNode.parent.children.length; i++) {
            elements.push(focusedNode.parent.children[i].node);
        }
        for (let i = 0; i < elements.length; i++) {
            if (elements[i] === focusedNode.node)
                index = i;
        }
        if (_dir < 0) {
            if (index >= elements.length)
                return;
            let el = elements.splice(index, 1);
            elements.splice(index + 1, 0, el[0]);
        }
        else {
            if (index <= 0)
                return;
            let el = elements.splice(index, 1);
            elements.splice(index - 1, 0, el[0]);
        }
        while (focusedNode.parent.node.children.length > 0)
            focusedNode.parent.node.removeChild(focusedNode.parent.node.children[0]);
        elements.forEach(el => {
            focusedNode.parent.node.appendChild(el);
        });
        mindmapData = createXMLFile();
        createMindmap();
        // saveState();
        focusNode(findNodeByID(focusedNode.node.getAttribute("ID")));
    }
    function setParent(_dir) {
        if (!focusedNode || focusedNode === root)
            return;
        saveState();
        let node = focusedNode;
        let id = focusedNode.node.getAttribute("ID");
        if (node.mapPosition == "left") {
            if (_dir < 0) {
                focusSibling(1);
                if (node.mapPosition != focusedNode.mapPosition)
                    node.changeSide();
                changeParent(node, focusedNode);
            }
            else {
                if (node.parent === root)
                    node.changeSide();
                else
                    changeParent(node, node.parent.parent);
            }
        }
        else {
            if (_dir < 0) {
                if (node.parent === root)
                    node.changeSide();
                else
                    changeParent(node, node.parent.parent);
            }
            else {
                focusSibling(1);
                changeParent(node, focusedNode);
            }
        }
        mindmapData = createXMLFile();
        createMindmap();
        focusNode(findNodeByID(id));
    }
    function deleteNode() {
        saveState();
        if (!focusedNode)
            return;
        let fallBackNode = focusedNode.parent.node.getAttribute("ID");
        if (focusedNode.parent.children.length > 1) {
            for (let i = 0; i < focusedNode.node.parentNode.children.length; i++) {
                if (focusedNode.node.parentNode.children[i] != focusedNode.node) {
                    fallBackNode = focusedNode.node.parentNode.children[i].getAttribute("ID");
                }
            }
        }
        if (focusedNode.parent === root)
            rootNode.removeChild(focusedNode.node);
        else
            focusedNode.parent.node.removeChild(focusedNode.node);
        mindmapData = createXMLFile();
        createMindmap();
        focusNode(findNodeByID(fallBackNode));
    }
    function createNewNode() {
        saveState();
        let parent = focusedNode ? focusedNode : root;
        let newNode = document.createElement("node");
        if (parent === root)
            rootNode.appendChild(newNode);
        else
            parent.node.appendChild(newNode);
        let newFMVNode = new FreeMindViewer.FMVNode(parent, ctx, "new Node", parent.mapPosition == "root" ? "left" : parent.mapPosition, false);
        newFMVNode.node = newNode;
        newFMVNode.node.setAttribute("TEXT", "new Node");
        newFMVNode.node.setAttribute("POSITION", parent.mapPosition == "root" ? "left" : parent.mapPosition);
        newFMVNode.node.setAttribute("ID", createID());
        newFMVNode.parent = parent;
        parent.children.push(newFMVNode);
        fmvNodes.push(newFMVNode);
        mindmapData = createXMLFile();
        createMindmap();
        focusNode(findNodeByID(newFMVNode.node.getAttribute("ID")));
        createTextFieldOnNode();
    }
    function onMouseDown(_event) {
        for (let i = 0; i < fmvNodes.length; i++) {
            if (fmvNodes[i].pfadrect) {
                if (ctx.isPointInPath(fmvNodes[i].pfadrect, _event.clientX, _event.clientY)) {
                    focusNode(fmvNodes[i]);
                    document.body.style.cursor = "no-drop";
                    if (focusedNode !== root) {
                        currentLevel = getLevel(focusedNode);
                    }
                    return;
                }
            }
        }
        focusNode(null);
    }
    function onMouseUp(_event) {
        document.body.style.cursor = "auto";
        if (!focusedNode)
            return;
        let id = focusedNode.node.getAttribute("ID");
        for (let i = 0; i < fmvNodes.length; i++) {
            if (fmvNodes[i].pfadrect) {
                if (ctx.isPointInPath(fmvNodes[i].pfadrect, _event.clientX, _event.clientY)) {
                    if (fmvNodes[i] != focusedNode && activeTextField == null) {
                        changeParent(focusedNode, fmvNodes[i]);
                        mindmapData = createXMLFile();
                        createMindmap();
                        focusNode(findNodeByID(id));
                        redrawWithoutChildren();
                        return;
                    }
                }
            }
        }
    }
    function onPointerMove(_event) {
        if (_event.buttons == 1) {
            if (focusedNode == null) {
                FreeMindViewer.rootNodeY += _event.movementY;
                FreeMindViewer.rootNodeX += _event.movementX;
                redrawWithoutChildren();
            }
            else {
                for (let i = 0; i < fmvNodes.length; i++) {
                    if (fmvNodes[i].pfadrect) {
                        if (ctx.isPointInPath(fmvNodes[i].pfadrect, _event.clientX, _event.clientY)) {
                            if (fmvNodes[i] != focusedNode && activeTextField == null) {
                                document.body.style.cursor = "alias";
                                return;
                            }
                        }
                    }
                }
                document.body.style.cursor = "no-drop";
            }
        }
    }
    function changeParent(_of, _to) {
        saveState();
        if (_of.node.contains(_to.node))
            return;
        if (_to === root) {
            _of.changeSide();
            rootNode.appendChild(_of.node);
        }
        else {
            _to.node.appendChild(_of.node);
            if (_of.node.getAttribute("POSITION") != _to.node.getAttribute("POSITION"))
                _of.changeSide();
        }
        mindmapData = createXMLFile();
        createMindmap();
        _of.fillstyle = "blue";
        focusNode(_of);
        redrawWithoutChildren();
        // saveState();
    }
    function focusParent(_dir) {
        if (!focusedNode)
            return;
        saveState();
        if (focusedNode === root) {
            root.children.forEach(el => {
                if (el.mapPosition == (_dir > 0 ? "right" : "left"))
                    focusNode(el);
            });
            return;
        }
        _dir = focusedNode.mapPosition == "right" ? _dir : -_dir;
        if (_dir < 0) {
            if (focusedNode.parent)
                focusNode(focusedNode.parent);
        }
        else {
            if (focusedNode.children.length > 0)
                focusNode(focusedNode.children[0]);
        }
        if (focusedNode !== root)
            currentLevel = getLevel(focusedNode);
    }
    function focusSibling(_dir) {
        if (!focusedNode)
            return;
        saveState();
        for (let i = 0; i < focusedNode.parent.children.length; i++) {
            if (focusedNode.parent.children[i] === focusedNode) {
                if ((i == 0 && _dir < 0) || (i == focusedNode.parent.children.length - 1 && _dir > 0)) {
                    findCousin(_dir);
                    return;
                }
                else {
                    focusNode(focusedNode.parent.children[(_dir < 0 ? i - 1 : i + 1)]);
                    return;
                }
            }
        }
    }
    function getLevel(_node) {
        //if (_node == null) { return null; }
        return _node.parent === root ? 1 : getLevel(_node.parent) + 1;
    }
    function findCousin(_dir) {
        let branchFound = false;
        let node = focusedNode.parent;
        let nodeBevore = focusedNode;
        //If dont have cousins -> return null
        if (node === root || node.parent === root) {
            return null;
        }
        //find cousin
        while (!branchFound) {
            if (node.parent.children.length > 1) {
                for (let i = 0; i < node.parent.children.length; i++) {
                    if (node.parent.children[i] === node) {
                        if ((i == 0 && _dir < 0) || (i == node.children.length - 1 && _dir > 0)) {
                            nodeBevore = node;
                            node = node.parent;
                        }
                        else {
                            nodeBevore = node;
                            node = node.parent;
                            branchFound = true;
                        }
                    }
                }
            }
            else if (node.parent === root) {
                return null;
            }
            else {
                nodeBevore = node;
                node = node.parent;
            }
        }
        //check if cousin has siblings in the right direction -> save the sibling -> if not -> return null
        let sibling = null;
        for (let i = 0; i < node.children.length; i++) {
            if (node.children[i] === nodeBevore) {
                //if ((i == 0 && _dir < 0) || (i == node.children.length - 1 && _dir > 0)) { return null; }
                sibling = node.children[i + _dir];
            }
        }
        if (sibling == null) {
            return null;
        }
        //find node on same level -> if not focus deepest child
        let levelFound = false;
        let currentNode = sibling;
        while (!levelFound) {
            if (getLevel(currentNode) == currentLevel) {
                focusNode(currentNode);
                levelFound = true;
            }
            else {
                if (currentNode.children.length > 0) {
                    currentNode = currentNode.children[_dir < 0 ? currentNode.children.length - 1 : 0];
                }
                else {
                    levelFound = true;
                    focusNode(currentNode);
                }
            }
        }
    }
    function focusNode(_node) {
        saveState();
        if (_node && _node.parent && _node !== root) {
            if (_node.parent.node.getAttribute("FOLDED") == "true") {
                return;
            }
        }
        if (focusedNode)
            focusedNode.fillstyle = "RGBA(10,10,10,0)";
        focusedNode = _node;
        if (focusedNode) {
            focusedNode.fillstyle = "RGBA(10,10,10,0.2)";
        }
        redrawWithoutChildren();
    }
    function createTextFieldOnNode() {
        if (!focusedNode)
            return;
        saveState();
        let textField = document.createElement("input");
        textField.style.position = "fixed";
        if (focusedNode.mapPosition == "left")
            textField.style.left = (focusedNode.posX - ctx.measureText(focusedNode.content).width) + "px";
        else
            textField.style.left = focusedNode.posX + "px";
        textField.style.top = focusedNode.posY - (focusedNode.childHight / 2) + "px";
        textField.style.zIndex = "5";
        document.querySelector("#canvasContainer").appendChild(textField);
        textField.value = focusedNode.content;
        textField.focus();
        activeTextField = textField;
        let node = focusedNode;
        textField.onblur = () => {
            updateNode(node);
        };
        function updateNode(_node) {
            if (textField.value != "")
                _node.node.setAttribute("TEXT", textField.value);
            activeTextField = null;
            textField.remove();
            mindmapData = createXMLFile();
            createMindmap();
            saveState();
            focusNode(findNodeByID(node.node.getAttribute("ID")));
        }
    }
    function findNodeByID(_id) {
        let nodeByID = null;
        fmvNodes.forEach(node => {
            if (node.node) {
                let id = node.node.getAttribute("ID");
                if (_id == id) {
                    nodeByID = node;
                }
            }
        });
        return nodeByID;
    }
    function clearMap() {
        ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height); // clears the canvas
    }
    function getUrlSearchJson() {
        try {
            let j = decodeURI(location.search);
            j = j
                .substring(1)
                .split("&")
                .join("\",\"")
                .split("=")
                .join("\":\"");
            return JSON.parse("{\"" + j + "\"}");
        }
        catch (_e) {
            console.log("Error in URL-Parameters: " + _e);
            return JSON.parse("{}");
        }
    }
    function createID() {
        let id = "ID_";
        let randomNumber = Math.floor(Math.random() * 1000000000);
        id += randomNumber;
        fmvNodes.forEach(node => {
            if (node.node) {
                let nodeID = node.node.getAttribute("ID");
                if (nodeID && nodeID == id) {
                    return createID();
                }
            }
        });
        return id;
    }
})(FreeMindViewer || (FreeMindViewer = {}));
//# sourceMappingURL=main.js.map