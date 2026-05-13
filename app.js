/**
 * Hierarchy Sorter
 * Drag-and-drop images into a nested visual hierarchy.
 * Pure vanilla JS — no dependencies.
 *
 * Drop zone model:
 * - Gap bars between nodes for sibling insertion (color-coded by depth)
 * - Dropping on a node header nests it as a child
 * - Pool accepts drops to unassign
 * - Bars only activate if the drop would actually change the hierarchy
 */

(function () {
  "use strict";

  const IMAGES = [
    { id: "img-1", src: "assets/img_01.png", label: "Screenshot 1" },
    { id: "img-2", src: "assets/img_02.png", label: "Screenshot 2" },
    { id: "img-3", src: "assets/img_03.png", label: "Screenshot 3" },
    { id: "img-4", src: "assets/img_04.png", label: "Screenshot 4" },
    { id: "img-5", src: "assets/img_05.png", label: "Screenshot 5" },
    { id: "img-6", src: "assets/img_06.png", label: "Screenshot 6" },
    { id: "img-7", src: "assets/img_07.png", label: "Screenshot 7" },
    { id: "img-8", src: "assets/img_08.png", label: "Screenshot 8" },
    { id: "img-9", src: "assets/img_09.png", label: "Screenshot 9" },
    { id: "img-10", src: "assets/img_10.png", label: "Screenshot 10" },
    { id: "img-11", src: "assets/img_11.png", label: "Screenshot 11" },
    { id: "img-12", src: "assets/img_12.png", label: "Screenshot 12" },
    { id: "img-13", src: "assets/img_13.png", label: "Screenshot 13" },
    { id: "img-14", src: "assets/img_14.png", label: "Screenshot 14" },
    { id: "img-15", src: "assets/img_15.png", label: "Screenshot 15" },
    { id: "img-16", src: "assets/img_16.png", label: "Screenshot 16" },
    { id: "img-17", src: "assets/img_17.png", label: "Screenshot 17" },
    { id: "img-18", src: "assets/img_18.png", label: "Screenshot 18" },
    { id: "img-19", src: "assets/img_19.png", label: "Screenshot 19" },
    { id: "img-20", src: "assets/img_20.png", label: "Screenshot 20" },
    { id: "img-21", src: "assets/img_21.png", label: "Screenshot 21" },
    { id: "img-22", src: "assets/img_22.png", label: "Screenshot 22" },
    { id: "img-23", src: "assets/img_23.png", label: "Screenshot 23" },
    { id: "img-24", src: "assets/img_24.png", label: "Screenshot 24" },
    { id: "img-25", src: "assets/img_25.png", label: "Screenshot 25" },
    { id: "img-26", src: "assets/img_26.png", label: "Screenshot 26" },
    { id: "img-27", src: "assets/img_27.png", label: "Screenshot 27" },
    { id: "img-28", src: "assets/img_28.png", label: "Screenshot 28" },
    { id: "img-29", src: "assets/img_29.png", label: "Screenshot 29" },
    { id: "img-30", src: "assets/img_30.png", label: "Screenshot 30" },
  ];

  const DEPTH_COLORS = [
    "#c2243fff", "#f4a261", "#2a9d8f", "#4287f5", "#9b5de5", "#f9008dff",
  ];

  let hierarchyTree = [];

  const poolContainer = document.getElementById("pool-container");
  const hierarchyContainer = document.getElementById("hierarchy-container");
  const resetBtn = document.getElementById("reset-btn");

  let draggedId = null;

  // --- Init ---
  function init() {
    loadState();
    render();
    resetBtn.addEventListener("click", resetAll);
  }

  // --- State ---
  function saveState() {
    sessionStorage.setItem("hierarchy_tree", JSON.stringify(hierarchyTree));
  }

  function loadState() {
    const saved = sessionStorage.getItem("hierarchy_tree");
    if (saved) {
      try { hierarchyTree = JSON.parse(saved); } catch { hierarchyTree = []; }
    }
  }

  function resetAll() {
    hierarchyTree = [];
    saveState();
    render();
  }

  // --- Tree helpers ---
  function getAllAssignedIds(nodes) {
    const ids = [];
    for (const node of nodes) {
      ids.push(node.id);
      ids.push(...getAllAssignedIds(node.children));
    }
    return ids;
  }

  function findNode(nodes, id) {
    for (const node of nodes) {
      if (node.id === id) return node;
      const found = findNode(node.children, id);
      if (found) return found;
    }
    return null;
  }

  function isDescendant(nodes, ancestorId, targetId) {
    const ancestor = findNode(nodes, ancestorId);
    if (!ancestor) return false;
    return getAllAssignedIds(ancestor.children).includes(targetId);
  }

  function removeNode(nodes, id) {
    for (let i = 0; i < nodes.length; i++) {
      if (nodes[i].id === id) {
        nodes.splice(i, 1);
        return true;
      }
      if (removeNode(nodes[i].children, id)) return true;
    }
    return false;
  }

  function insertAtPosition(parentArray, index, node) {
    parentArray.splice(index, 0, node);
  }

  /**
   * Determine the current position of a node in the tree.
   * Returns { parentId, index } or null if not in tree.
   */
  function getCurrentPosition(nodes, id, parentId) {
    parentId = parentId || "hierarchy-root";
    for (let i = 0; i < nodes.length; i++) {
      if (nodes[i].id === id) return { parentId, index: i };
      const found = getCurrentPosition(nodes[i].children, id, nodes[i].id);
      if (found) return found;
    }
    return null;
  }

  /**
   * Check if dropping imageId as sibling at (parentId, index) would be a no-op.
   * A no-op means the item is already at that exact position or the adjacent position
   * (since removing it shifts indices).
   */
  function wouldSiblingDropBeNoop(imageId, parentId, index) {
    const pos = getCurrentPosition(hierarchyTree, imageId);
    if (!pos) return false; // not in tree yet, always a real move

    if (pos.parentId !== parentId) return false; // different parent = real move

    // Same parent: dropping at current index or index+1 is a no-op
    // (because the gap before and after the item both resolve to the same position)
    return index === pos.index || index === pos.index + 1;
  }

  /**
   * Check if dropping imageId as child of targetNodeId would be a no-op.
   * It's a no-op if imageId is already the last child of targetNodeId
   * (since dropAsChild appends to end).
   */
  function wouldChildDropBeNoop(imageId, targetNodeId) {
    const target = findNode(hierarchyTree, targetNodeId);
    if (!target) return false;
    const children = target.children;
    if (children.length === 0) return false;
    return children[children.length - 1].id === imageId;
  }

  // --- Drop operations ---

  function dropAsChild(imageId, targetNodeId) {
    if (imageId === targetNodeId) return;
    if (isDescendant(hierarchyTree, imageId, targetNodeId)) return;
    if (wouldChildDropBeNoop(imageId, targetNodeId)) return;

    const existing = findNode(hierarchyTree, imageId);
    const nodeToInsert = existing
      ? { id: imageId, children: [...existing.children] }
      : { id: imageId, children: [] };

    removeNode(hierarchyTree, imageId);

    const target = findNode(hierarchyTree, targetNodeId);
    if (target) {
      target.children.push(nodeToInsert);
    }

    saveState();
    render();
  }

  function dropAsSibling(imageId, parentId, index) {
    if (imageId === parentId) return;
    if (parentId !== "hierarchy-root" && isDescendant(hierarchyTree, imageId, parentId)) return;
    if (wouldSiblingDropBeNoop(imageId, parentId, index)) return;

    const existing = findNode(hierarchyTree, imageId);
    const nodeToInsert = existing
      ? { id: imageId, children: [...existing.children] }
      : { id: imageId, children: [] };

    removeNode(hierarchyTree, imageId);

    let targetArray;
    if (parentId === "hierarchy-root") {
      targetArray = hierarchyTree;
    } else {
      const parentNode = findNode(hierarchyTree, parentId);
      if (!parentNode) return;
      targetArray = parentNode.children;
    }

    const adjustedIndex = Math.min(index, targetArray.length);
    insertAtPosition(targetArray, adjustedIndex, nodeToInsert);

    saveState();
    render();
  }

  function dropToPool(imageId) {
    removeNode(hierarchyTree, imageId);
    saveState();
    render();
  }

  // --- Rendering ---
  function render() {
    renderPool();
    renderHierarchy();
  }

  function renderPool() {
    poolContainer.innerHTML = "";
    const assignedIds = getAllAssignedIds(hierarchyTree);
    const poolImages = IMAGES.filter((img) => !assignedIds.includes(img.id));

    for (const img of poolImages) {
      poolContainer.appendChild(createImageCard(img));
    }

    setupPoolDropZone();
  }

  function renderHierarchy() {
    hierarchyContainer.innerHTML = "";

    if (hierarchyTree.length === 0) {
      hierarchyContainer.appendChild(createGapBar("hierarchy-root", 0, 0));
    } else {
      for (let i = 0; i <= hierarchyTree.length; i++) {
        hierarchyContainer.appendChild(createGapBar("hierarchy-root", i, 0));
        if (i < hierarchyTree.length) {
          hierarchyContainer.appendChild(
            createHierarchyNode(hierarchyTree[i], 0, "hierarchy-root", i)
          );
        }
      }
    }

    setupHierarchyRootDropZone();
  }

  function createImageCard(img) {
    const card = document.createElement("div");
    card.className = "image-card";
    card.draggable = true;
    card.dataset.id = img.id;

    const image = document.createElement("img");
    image.src = img.src;
    image.alt = img.label;
    image.loading = "lazy";
    image.onerror = function () {
      this.style.display = "none";
      card.style.display = "flex";
      card.style.alignItems = "center";
      card.style.justifyContent = "center";
      const placeholder = document.createElement("span");
      placeholder.textContent = img.label;
      placeholder.style.fontSize = "0.7rem";
      placeholder.style.color = "#a8dadc";
      placeholder.style.padding = "0.3rem";
      placeholder.style.textAlign = "center";
      card.insertBefore(placeholder, card.firstChild);
    };

    const label = document.createElement("div");
    label.className = "label";
    label.textContent = img.label;

    card.appendChild(image);
    card.appendChild(label);

    card.addEventListener("dragstart", (e) => {
      draggedId = img.id;
      card.classList.add("dragging");
      e.dataTransfer.effectAllowed = "move";
      e.dataTransfer.setData("text/plain", img.id);
    });

    card.addEventListener("dragend", () => {
      card.classList.remove("dragging");
      draggedId = null;
      clearAllHighlights();
    });

    // Click to zoom (only if not dragging)
    let didDrag = false;
    card.addEventListener("mousedown", () => { didDrag = false; });
    card.addEventListener("mousemove", () => { didDrag = true; });
    card.addEventListener("click", (e) => {
      if (didDrag) return;
      e.stopPropagation();
      openLightbox(img.src, img.label);
    });

    return card;
  }

  function createHierarchyNode(node, depth, parentId, indexInParent) {
    const imgData = IMAGES.find((i) => i.id === node.id);
    if (!imgData) return document.createDocumentFragment();

    const wrapper = document.createElement("div");
    wrapper.className = "hierarchy-node";
    wrapper.dataset.depth = Math.min(depth, 5);
    wrapper.dataset.id = node.id;

    // --- Node header (drop target = nest as child) ---
    const header = document.createElement("div");
    header.className = "node-header";

    const card = createImageCard(imgData);
    const labelEl = document.createElement("span");
    labelEl.className = "node-label";
    labelEl.textContent = imgData.label;

    header.appendChild(card);
    header.appendChild(labelEl);

    setupNodeDropTarget(header, node.id);

    // --- Children area ---
    const childrenZone = document.createElement("div");
    childrenZone.className = "children-zone";

    if (node.children.length === 0) {
      childrenZone.appendChild(createGapBar(node.id, 0, depth + 1));
    } else {
      for (let i = 0; i <= node.children.length; i++) {
        childrenZone.appendChild(createGapBar(node.id, i, depth + 1));
        if (i < node.children.length) {
          childrenZone.appendChild(
            createHierarchyNode(node.children[i], depth + 1, node.id, i)
          );
        }
      }
    }

    wrapper.appendChild(header);
    wrapper.appendChild(childrenZone);

    return wrapper;
  }

  // --- Gap bars ---
  function createGapBar(parentId, index, depth) {
    const bar = document.createElement("div");
    bar.className = "gap-bar";
    bar.dataset.parent = parentId;
    bar.dataset.index = index;
    bar.dataset.depth = Math.min(depth, 5);

    const indicator = document.createElement("div");
    indicator.className = "gap-indicator";
    const color = DEPTH_COLORS[Math.min(depth, 5)];
    indicator.style.setProperty("--bar-color", color);
    bar.appendChild(indicator);

    bar.addEventListener("dragover", (e) => {
      e.preventDefault();
      e.stopPropagation();

      // Only highlight if this drop would actually move the item
      const id = draggedId;
      if (!id) return;
      if (wouldSiblingDropBeNoop(id, parentId, index)) {
        e.dataTransfer.dropEffect = "none";
        return;
      }
      // Don't allow dropping onto own descendant
      if (parentId !== "hierarchy-root" && isDescendant(hierarchyTree, id, parentId)) {
        e.dataTransfer.dropEffect = "none";
        return;
      }

      e.dataTransfer.dropEffect = "move";
      bar.classList.add("gap-active");
    });

    bar.addEventListener("dragleave", (e) => {
      if (!bar.contains(e.relatedTarget)) {
        bar.classList.remove("gap-active");
      }
    });

    bar.addEventListener("drop", (e) => {
      e.preventDefault();
      e.stopPropagation();
      bar.classList.remove("gap-active");

      const id = e.dataTransfer.getData("text/plain") || draggedId;
      if (!id) return;

      dropAsSibling(id, parentId, index);
    });

    return bar;
  }

  // --- Node header drop target ---
  function setupNodeDropTarget(headerEl, nodeId) {
    headerEl.addEventListener("dragover", (e) => {
      e.preventDefault();
      e.stopPropagation();

      const id = draggedId;
      if (!id) return;
      if (id === nodeId) {
        e.dataTransfer.dropEffect = "none";
        return;
      }
      if (wouldChildDropBeNoop(id, nodeId)) {
        e.dataTransfer.dropEffect = "none";
        return;
      }
      if (isDescendant(hierarchyTree, id, nodeId)) {
        e.dataTransfer.dropEffect = "none";
        return;
      }

      // Color based on the depth the child would land at
      const nodeEl = headerEl.closest(".hierarchy-node");
      const parentDepth = nodeEl ? parseInt(nodeEl.dataset.depth, 10) : 0;
      const childDepth = Math.min(parentDepth + 1, 5);
      headerEl.style.setProperty("--drop-color", DEPTH_COLORS[childDepth]);

      e.dataTransfer.dropEffect = "move";
      headerEl.classList.add("node-drop-target");
    });

    headerEl.addEventListener("dragleave", (e) => {
      if (!headerEl.contains(e.relatedTarget)) {
        headerEl.classList.remove("node-drop-target");
      }
    });

    headerEl.addEventListener("drop", (e) => {
      e.preventDefault();
      e.stopPropagation();
      headerEl.classList.remove("node-drop-target");

      const id = e.dataTransfer.getData("text/plain") || draggedId;
      if (!id) return;

      dropAsChild(id, nodeId);
    });
  }

  // --- Pool drop zone ---
  function setupPoolDropZone() {
    poolContainer.addEventListener("dragover", (e) => {
      e.preventDefault();
      e.dataTransfer.dropEffect = "move";
      poolContainer.classList.add("drag-over");
    });

    poolContainer.addEventListener("dragleave", (e) => {
      if (!poolContainer.contains(e.relatedTarget)) {
        poolContainer.classList.remove("drag-over");
      }
    });

    poolContainer.addEventListener("drop", (e) => {
      e.preventDefault();
      e.stopPropagation();
      poolContainer.classList.remove("drag-over");

      const id = e.dataTransfer.getData("text/plain") || draggedId;
      if (!id) return;

      dropToPool(id);
    });
  }

  // --- Hierarchy root background drop ---
  function setupHierarchyRootDropZone() {
    hierarchyContainer.addEventListener("dragover", (e) => {
      if (e.target === hierarchyContainer) {
        e.preventDefault();
        e.dataTransfer.dropEffect = "move";
        hierarchyContainer.classList.add("drag-over");
      }
    });

    hierarchyContainer.addEventListener("dragleave", (e) => {
      if (!hierarchyContainer.contains(e.relatedTarget)) {
        hierarchyContainer.classList.remove("drag-over");
      }
    });

    hierarchyContainer.addEventListener("drop", (e) => {
      if (e.target === hierarchyContainer) {
        e.preventDefault();
        e.stopPropagation();
        hierarchyContainer.classList.remove("drag-over");

        const id = e.dataTransfer.getData("text/plain") || draggedId;
        if (!id) return;

        dropAsSibling(id, "hierarchy-root", hierarchyTree.length);
      }
    });
  }

  function clearAllHighlights() {
    document.querySelectorAll(".drag-over, .gap-active, .node-drop-target").forEach((el) => {
      el.classList.remove("drag-over", "gap-active", "node-drop-target");
    });
  }

  // --- Lightbox ---
  function openLightbox(src, alt) {
    const overlay = document.createElement("div");
    overlay.className = "lightbox-overlay";

    const img = document.createElement("img");
    img.src = src;
    img.alt = alt || "";

    overlay.appendChild(img);
    document.body.appendChild(overlay);

    overlay.addEventListener("click", () => {
      overlay.remove();
    });

    document.addEventListener("keydown", function handler(e) {
      if (e.key === "Escape") {
        overlay.remove();
        document.removeEventListener("keydown", handler);
      }
    });
  }

  // --- Boot ---
  document.addEventListener("DOMContentLoaded", init);
})();
