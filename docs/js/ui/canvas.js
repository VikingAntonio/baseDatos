import { stateManager } from '../state.js';

export class Canvas {
    constructor(containerId) {
        this.container = document.getElementById(containerId);
        this.init();
    }

    init() {
        stateManager.subscribe((state) => {
            this.render(state);
        });
    }

    render(state) {
        const currentTableIds = new Set(state.tables.map(t => t.id));
        
        // Remove tables that are no longer in state
        const renderedTables = this.container.querySelectorAll('.table-node');
        renderedTables.forEach(tableEl => {
            if (!currentTableIds.has(tableEl.id)) {
                if (window.jsp) window.jsp.remove(tableEl);
                tableEl.remove();
            }
        });

        // Update or Add tables
        state.tables.forEach(table => {
            let tableEl = document.getElementById(table.id);
            if (!tableEl) {
                tableEl = this.createTableElement(table);
                this.container.appendChild(tableEl);
                this.initSortable(tableEl, table.id);
            } else {
                this.updateTableElement(tableEl, table);
            }
        });

        if (window.jsp) {
            window.jsp.repaintEverything();
        }
    }

    initSortable(tableEl, tableId) {
        const colContainer = tableEl.querySelector('.table-columns');
        Sortable.create(colContainer, {
            animation: 150,
            handle: '.column-item',
            onEnd: (evt) => {
                const columnIds = Array.from(colContainer.querySelectorAll('.column-item')).map(el => el.id);
                const table = stateManager.getState().tables.find(t => t.id === tableId);
                if (table) {
                    const newColumns = columnIds.map(id => table.columns.find(c => c.id === id));
                    stateManager.updateTable(tableId, { columns: newColumns });
                    if (window.jsp) window.jsp.revalidate(tableEl);
                }
            }
        });
    }

    createTableElement(table) {
        const div = document.createElement('div');
        div.id = table.id;
        div.className = 'table-node';
        div.style.left = `${table.posX}px`;
        div.style.top = `${table.posY}px`;
        div.innerHTML = `
            <div class="table-header">
                <span class="table-name" contenteditable="true" spellcheck="false">${table.name}</span>
                <button class="delete-table-btn">×</button>
            </div>
            <div class="table-columns"></div>
            <div class="table-footer">
                <button class="add-column-btn">+ Column</button>
            </div>
        `;

        this.updateTableElement(div, table);

        // Events
        const nameEl = div.querySelector('.table-name');
        nameEl.onblur = () => {
            stateManager.updateTable(table.id, { name: nameEl.textContent });
        };
        nameEl.onkeydown = (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                nameEl.blur();
            }
        };
        nameEl.onclick = (e) => e.stopPropagation();
        nameEl.onmousedown = (e) => e.stopPropagation();

        div.querySelector('.delete-table-btn').onclick = (e) => {
            e.stopPropagation();
            stateManager.removeTable(table.id);
        };

        div.querySelector('.add-column-btn').onclick = (e) => {
            e.stopPropagation();
            stateManager.addColumn(table.id);
        };

        div.onclick = (e) => {
            e.stopPropagation();
            window.dispatchEvent(new CustomEvent('table-selected', { detail: { tableId: table.id } }));
        };

        return div;
    }

    updateTableElement(el, table) {
        const nameEl = el.querySelector('.table-name');
        if (document.activeElement !== nameEl) {
            nameEl.textContent = table.name;
        }
        
        if (!el.classList.contains('dragging')) {
            el.style.left = `${table.posX}px`;
            el.style.top = `${table.posY}px`;
            el.style.transform = 'none';
            el.setAttribute('data-x', 0);
            el.setAttribute('data-y', 0);
        }

        const columnsContainer = el.querySelector('.table-columns');
        const currentColIds = new Set(table.columns.map(c => c.id));

        // Remove old columns
        Array.from(columnsContainer.children).forEach(colEl => {
            if (!currentColIds.has(colEl.id)) {
                if (window.jsp) window.jsp.unmakeSource(colEl);
                if (window.jsp) window.jsp.unmakeTarget(colEl);
                colEl.remove();
            }
        });

        // Add or Update columns
        table.columns.forEach((col, index) => {
            let colEl = document.getElementById(col.id);
            if (!colEl) {
                colEl = document.createElement('div');
                colEl.className = 'column-item';
                colEl.id = col.id;
                columnsContainer.appendChild(colEl);
            }
            
            const iconsHTML = `
                ${col.pk ? '<span class="pk-icon">🔑</span>' : ''}
                ${col.fk ? '<span class="fk-icon">🔗</span>' : ''}
            `;
            
            const colNameEl = colEl.querySelector('.col-name');
            const colTypeEl = colEl.querySelector('.col-type');

            if (document.activeElement !== colNameEl && document.activeElement !== colTypeEl) {
                const content = `
                    <div class="col-handle-left"></div>
                    <div class="col-handle-right"></div>
                    <span class="col-icons">${iconsHTML}</span>
                    <span class="col-name" contenteditable="true" spellcheck="false">${col.name}</span>
                    <span class="col-type" contenteditable="true" spellcheck="false">${col.type}</span>
                `;

                if (colEl.innerHTML !== content) {
                    colEl.innerHTML = content;

                    // Attach event listeners after setting innerHTML
                    const nameInput = colEl.querySelector('.col-name');
                    const typeInput = colEl.querySelector('.col-type');

                    nameInput.onblur = () => stateManager.updateColumn(table.id, col.id, { name: nameInput.textContent });
                    typeInput.onblur = () => stateManager.updateColumn(table.id, col.id, { type: typeInput.textContent });

                    const handleKey = (e) => {
                        if (e.key === 'Enter') {
                            e.preventDefault();
                            e.target.blur();
                        }
                    };
                    nameInput.onkeydown = handleKey;
                    typeInput.onkeydown = handleKey;

                    nameInput.onclick = (e) => e.stopPropagation();
                    typeInput.onclick = (e) => e.stopPropagation();
                    nameInput.onmousedown = (e) => e.stopPropagation();
                    typeInput.onmousedown = (e) => e.stopPropagation();

                    // If content changed, endpoints might need re-positioning
                    if (window.jsp) window.jsp.revalidate(el);
                }
            }

            colEl.onclick = (e) => {
                e.stopPropagation();
                window.dispatchEvent(new CustomEvent('column-selected', { 
                    detail: { tableId: table.id, columnId: col.id } 
                }));
            };

            // Maintain order
            if (columnsContainer.children[index] !== colEl) {
                columnsContainer.insertBefore(colEl, columnsContainer.children[index]);
            }
        });

        if (window.jsp) {
            window.jsp.revalidate(el);
        }
    }
}
