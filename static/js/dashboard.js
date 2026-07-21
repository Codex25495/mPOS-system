// ============================================================
// GLOBALS
// ============================================================
var cart = [];
var menuItems = [];
var currentCategory = 'all';
var currentAdminTab = 'menu';
var refreshInterval = null;
var notificationSound = null;
var lastOrderCount = 0;

// ============================================================
// INIT
// ============================================================
document.addEventListener('DOMContentLoaded', function() {
    document.getElementById('roleDisplay').textContent = (userRole || 'Guest').toUpperCase();
    document.getElementById('nameDisplay').textContent = userName || userUsername || 'User';
    buildSidebar();
    
    try {
        notificationSound = new Audio('data:audio/wav;base64,UklGRlQAAABXQVZFZm10IBAAAAABAAEARKwAAIhYAQACABAAZGF0YVoAAABxYWFhYWFhYWFhYWFhYWFhYWFhYWFhYWFhYWFhYWFhYWFhYWFhYWFhYWFhYWFhYWFhYWFhYWFhYWFhYWFhYWFhYWFhYWFhYWE=');
    } catch(e) {}
});

// ============================================================
// LOGOUT
// ============================================================
async function logout() {
    if (!confirm('Are you sure you want to logout?')) return;
    
    try {
        const response = await fetch('/api/logout');
        const data = await response.json();
        
        if (data.success) {
            window.location.href = '/login';
        } else {
            alert('Logout failed. Please try again.');
        }
    } catch (error) {
        console.error('Logout error:', error);
        window.location.href = '/login';
    }
}

// ============================================================
// SIDEBAR
// ============================================================
function buildSidebar() {
    var sidebar = document.getElementById('sidebar');
    var items = [];
    if (userRole === 'waiter') {
        items = [
            { icon: '🍽️', label: 'Order', id: 'order' },
            { icon: '📋', label: 'Orders', id: 'my-orders' }
        ];
    } else if (userRole === 'kitchen') {
        items = [
            { icon: '👨‍🍳', label: 'Food', id: 'food-orders' }
        ];
    } else if (userRole === 'bar') {
        items = [
            { icon: '🍺', label: 'Bar', id: 'bar-orders' }
        ];
    } else if (userRole === 'cashier') {
        items = [
            { icon: '💰', label: 'Billing', id: 'billing' }
        ];
    } else if (userRole === 'admin') {
        items = [
            { icon: '👑', label: 'Admin', id: 'admin' },
            { icon: '📡', label: 'Live', id: 'live-orders' }
        ];
    }
    sidebar.innerHTML = items.map(function(item) {
        return '<button class="sidebar-item" onclick="switchSection(\'' + item.id + '\')"><span class="icon">' + item.icon + '</span><span class="label">' + item.label + '</span></button>';
    }).join('');
    if (items.length > 0) {
        var firstBtn = sidebar.querySelector('.sidebar-item');
        if (firstBtn) firstBtn.classList.add('active');
        switchSection(items[0].id);
    }
}

function switchSection(sectionId) {
    if (refreshInterval) {
        clearInterval(refreshInterval);
        refreshInterval = null;
    }
    document.querySelectorAll('.sidebar-item').forEach(function(el) {
        el.classList.remove('active');
    });
    var activeBtn = document.querySelector('.sidebar-item[onclick*="' + sectionId + '"]');
    if (activeBtn) activeBtn.classList.add('active');

    var views = {
        'order': loadWaiterOrderView,
        'my-orders': loadWaiterOrdersView,
        'food-orders': loadKitchenView,
        'bar-orders': loadBarView,
        'billing': loadCashierView,
        'admin': loadAdminView,
        'live-orders': loadLiveOrdersView
    };
    if (views[sectionId]) {
        views[sectionId]();
    }
}

// ============================================================
// WAITER: ORDER VIEW
// ============================================================
function loadWaiterOrderView() {
    var content = document.getElementById('contentArea');
    content.innerHTML = `
        <div class="order-layout">
            <div class="glass-card">
                <div class="flex-between" style="margin-bottom:16px;">
                    <h3 style="font-size:18px; color:#6EE7B7;">🍽️ Menu</h3>
                    <span class="text-muted" style="font-size:12px;">Tap to add</span>
                </div>
                <div class="menu-categories" id="menuCategories">
                    <button class="active" data-category="all">All</button>
                    <button data-category="food">Food</button>
                    <button data-category="beverage">Beverages</button>
                </div>
                <div id="menuGrid" class="menu-grid">Loading...</div>
            </div>
            <div class="glass-card" style="display:flex; flex-direction:column;">
                <h3 style="font-size:18px; color:#6EE7B7; margin-bottom:12px;">🛒 Current Order</h3>
                <div class="cart-scroll" id="cartItems">
                    <p class="text-muted text-center" style="padding:20px 0;">No items added yet</p>
                </div>
                <div class="cart-total">
                    <span>Total</span>
                    <span class="amount" id="cartTotal">KES 0</span>
                </div>
                <div class="cart-actions">
                    <input type="number" id="tableNumber" placeholder="Table Number" min="1" max="7">
                    <input type="number" id="roomNumber" placeholder="Room Number" min="1" max="5">
                    <button class="btn-primary" onclick="submitOrder()" style="width:100%; padding:14px; font-size:16px;">
                        📤 Submit Order
                    </button>
                </div>
            </div>
        </div>
    `;
    document.querySelectorAll('#menuCategories button').forEach(function(btn) {
        btn.addEventListener('click', function() {
            document.querySelectorAll('#menuCategories button').forEach(function(b) {
                b.classList.remove('active');
            });
            this.classList.add('active');
            currentCategory = this.dataset.category;
            renderMenu();
        });
    });
    loadMenu();
}

async function loadMenu() {
    try {
        var res = await fetch('/api/menu');
        menuItems = await res.json();
        renderMenu();
    } catch (e) {
        document.getElementById('menuGrid').innerHTML = '<p class="text-muted">Error loading menu</p>';
    }
}

function renderMenu() {
    var grid = document.getElementById('menuGrid');
    if (!grid) return;
    var filtered = menuItems;
    if (currentCategory !== 'all') {
        filtered = menuItems.filter(function(item) {
            return item.category === currentCategory;
        });
    }
    if (!filtered.length) {
        grid.innerHTML = '<p class="text-muted text-center" style="padding:20px 0;">No items in this category</p>';
        return;
    }
    grid.innerHTML = filtered.map(function(item) {
        return '<div class="menu-item-card" onclick="addToCart(' + item.item_id + ', \'' + item.name.replace(/'/g, "\\'") + '\', ' + item.price + ')"><div class="item-name">' + item.name + '</div><div class="item-price">KES ' + item.price + '</div><div class="item-category">' + item.category + '</div></div>';
    }).join('');
}

function addToCart(id, name, price) {
    var existing = cart.find(function(i) {
        return i.id === id;
    });
    if (existing) {
        existing.quantity++;
    } else {
        cart.push({ id: id, name: name, price: price, quantity: 1 });
    }
    updateCartDisplay();
}

function updateCartDisplay() {
    var container = document.getElementById('cartItems');
    var totalSpan = document.getElementById('cartTotal');
    if (!container) return;
    if (!cart.length) {
        container.innerHTML = '<p class="text-muted text-center" style="padding:20px 0;">No items added yet</p>';
        totalSpan.textContent = 'KES 0';
        return;
    }
    var html = '',
        total = 0;
    cart.forEach(function(item, index) {
        var subtotal = item.price * item.quantity;
        total += subtotal;
        html += '<div class="cart-item"><div class="cart-item-info"><span class="cart-item-name">' + item.name + '</span><span class="cart-item-price">KES ' + item.price + ' × ' + item.quantity + '</span></div><div class="cart-item-actions"><button class="qty-btn" onclick="updateQuantity(' + index + ', -1)">−</button><span style="font-size:14px; font-weight:600; min-width:20px; text-align:center;">' + item.quantity + '</span><button class="qty-btn" onclick="updateQuantity(' + index + ', 1)">+</button><button class="qty-btn remove" onclick="removeFromCart(' + index + ')">✕</button></div></div>';
    });
    container.innerHTML = html;
    totalSpan.textContent = 'KES ' + total;
}

function updateQuantity(index, change) {
    cart[index].quantity += change;
    if (cart[index].quantity <= 0) {
        cart.splice(index, 1);
    }
    updateCartDisplay();
}

function removeFromCart(index) {
    cart.splice(index, 1);
    updateCartDisplay();
}

async function submitOrder() {
    if (!cart.length) {
        alert('🛒 Cart is empty! Add some items first.');
        return;
    }

    var tableNumber = document.getElementById('tableNumber')?.value || '';
    var roomNumber = document.getElementById('roomNumber')?.value || '';

    // Validate table number (1-7)
    if (tableNumber) {
        var tableNum = parseInt(tableNumber);
        if (isNaN(tableNum) || tableNum < 1 || tableNum > 7) {
            alert('⚠️ Please enter a valid Table Number');
            return;
        }
    }

    // Validate room number (1-5)
    if (roomNumber) {
        var roomNum = parseInt(roomNumber);
        if (isNaN(roomNum) || roomNum < 1 || roomNum > 5) {
            alert('⚠️ Please enter a valid Room Number');
            return;
        }
    }

    if (!tableNumber && !roomNumber) {
        alert('⚠️ Please enter either a Table Number OR Room Number');
        return;
    }

    var total = cart.reduce(function(sum, i) {
        return sum + (i.price * i.quantity);
    }, 0);

    try {
        var res = await fetch('/api/orders', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                table_number: tableNumber || null,
                room_number: roomNumber || null,
                total_amount: total,
                items: cart.map(function(i) {
                    return { menu_item_id: i.id, quantity: i.quantity, price: i.price, instructions: '' };
                })
            })
        });
        var data = await res.json();
        if (data.success) {
            var location = tableNumber ? 'Table ' + tableNumber : 'Room ' + roomNumber;
            alert('✅ Order submitted for ' + location + '!\n\n⏰ Estimated wait time: ' + data.eta_minutes + ' minutes');
            cart = [];
            updateCartDisplay();
            document.getElementById('tableNumber').value = '';
            document.getElementById('roomNumber').value = '';
        } else {
            alert('❌ Error: ' + data.message);
        }
    } catch (e) {
        alert('❌ Network error. Is the server running?');
    }
}

// ============================================================
// WAITER: MY ORDERS
// ============================================================
function loadWaiterOrdersView() {
    document.getElementById('contentArea').innerHTML = `
        <div class="glass-card">
            <div class="flex-between" style="margin-bottom:16px;">
                <h3 style="font-size:18px; color:#6EE7B7;">📋 My Orders</h3>
                <div style="display:flex; align-items:center; gap:12px;">
                    <span class="text-muted" style="font-size:12px;">🔄 Live updates every 10s</span>
                    <span id="readyNotification" style="display:none; background:#34d399; color:#064E3B; padding:4px 12px; border-radius:30px; font-size:12px; font-weight:600;">✅ Ready for pickup!</span>
                </div>
            </div>
            <div id="waiterOrdersList">
                <p class="text-muted text-center" style="padding:20px 0;">Loading your orders...</p>
            </div>
        </div>
    `;
    loadWaiterOrders();
    refreshInterval = setInterval(loadWaiterOrders, 10000);
}

async function loadWaiterOrders() {
    try {
        var res = await fetch('/api/all-active-orders');
        var orders = await res.json();
        var container = document.getElementById('waiterOrdersList');
        if (!container) return;

        var readyCount = orders.filter(function(o) {
            return o.status === 'ready';
        }).length;
        var notificationEl = document.getElementById('readyNotification');
        if (notificationEl) {
            if (readyCount > 0) {
                notificationEl.style.display = 'inline-block';
                notificationEl.textContent = '✅ ' + readyCount + ' order' + (readyCount > 1 ? 's' : '') + ' ready for pickup!';
            } else {
                notificationEl.style.display = 'none';
            }
        }

        orders.sort(function(a, b) {
            if (a.status === 'ready' && b.status !== 'ready') return -1;
            if (b.status === 'ready' && a.status !== 'ready') return 1;
            return new Date(a.created_at) - new Date(b.created_at);
        });

        if (!orders.length) {
            container.innerHTML = '<p class="text-muted text-center" style="padding:20px 0;">No orders found</p>';
            return;
        }

        container.innerHTML = orders.map(function(o) {
            var itemsHtml = '';
            if (o.order_items && o.order_items.length > 0) {
                itemsHtml = '<div style="margin:8px 0; padding:8px; background:rgba(255,255,255,0.05); border-radius:8px;">';
                for (var i = 0; i < o.order_items.length; i++) {
                    var item = o.order_items[i];
                    var itemName = 'Item';
                    var itemQty = item.quantity || 1;
                    var itemPrice = 0;
                    
                    if (item.menu_items) {
                        itemName = item.menu_items.name || 'Item';
                        itemPrice = item.menu_items.price || 0;
                    } else if (item.name) {
                        itemName = item.name;
                        itemPrice = item.price || 0;
                    }
                    
                    var subtotal = itemQty * itemPrice;
                    itemsHtml += '<div style="display:flex; justify-content:space-between; padding:2px 0; font-size:13px;">' +
                        '<span>• ' + itemQty + 'x ' + itemName + '</span>' +
                        '<span style="color:#6EE7B7;">KES ' + subtotal + '</span>' +
                        '</div>';
                }
                itemsHtml += '</div>';
            }

            var statusText = {
                'pending': '⏳ Pending',
                'preparing': '🔧 Preparing',
                'ready': '✅ READY FOR PICKUP!',
                'served': '✅ Served',
                'billed': '💰 Billed'
            };

            var readyClass = o.status === 'ready' ? 'ready-glow' : '';
            var readyBorderColor = o.status === 'ready' ? '#34d399' : '#fbbf24';

            var location = '';
            if (o.table_number) {
                location = '📋 Table ' + o.table_number;
            } else if (o.room_number) {
                location = '🏨 Room ' + o.room_number;
            }

            var serveButton = o.status === 'ready' ?
                '<div style="margin-top:8px;"><button class="btn-success" onclick="serveOrder(' + o.order_id + ')">🟢 Serve Order</button></div>' :
                '';

            return '<div class="kitchen-order-card ' + readyClass + '" style="border-left-color: ' + readyBorderColor + ';">' +
                '<div class="order-header"><span class="order-number">' + o.order_number + '</span><span class="badge badge-' + o.status + '" style="font-size:13px; ' + (o.status === 'ready' ? 'background:rgba(52,211,153,0.3); color:#34d399;' : '') + '">' + (statusText[o.status] || o.status) + '</span></div>' +
                itemsHtml +
                '<div style="display:flex; justify-content:space-between; align-items:center; font-size:13px;">' +
                '<span>' + location + '</span>' +
                '<span style="color:#6EE7B7; font-weight:600;">KES ' + o.total_amount + '</span>' +
                '</div>' +
                (o.eta_display ? '<div style="margin-top:8px; font-size:12px; color:rgba(255,255,255,0.4);">⏱️ ' + o.eta_display + '</div>' : '') +
                (o.status === 'ready' ? '<div style="margin-top:8px; font-size:13px; color:#34d399; font-weight:600;">🟢 Ready for pickup - Please serve!</div>' : '') +
                serveButton +
                '</div>';
        }).join('');
    } catch (e) {
        console.error(e);
    }
}

async function serveOrder(orderId) {
    if (!confirm('✅ Mark this order as SERVED?')) return;
    try {
        var res = await fetch('/api/update-order-status', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ order_id: orderId, status: 'served' })
        });
        var data = await res.json();
        if (data.success) {
            alert('✅ Order marked as SERVED!');
            loadWaiterOrders();
        } else {
            alert('❌ Error: ' + data.message);
        }
    } catch (e) {
        alert('❌ Error marking as served');
    }
}

// ============================================================
// KITCHEN VIEW (FOOD ONLY)
// ============================================================
function loadKitchenView() {
    document.getElementById('contentArea').innerHTML = `
        <div class="glass-card">
            <div class="flex-between" style="margin-bottom:20px;">
                <h3 style="font-size:18px; color:#6EE7B7;">👨‍🍳 Kitchen Display</h3>
                <span class="text-muted" style="font-size:12px;">Live updates every 5s</span>
            </div>
            <div class="kitchen-columns">
                <div class="kitchen-column">
                    <div class="kitchen-column-header"><h3 style="color:#fbbf24;">⏳ Pending</h3><span class="count" id="pendingCount">0</span></div>
                    <div id="pendingOrders" style="max-height:200px; overflow-y:auto;"></div>
                </div>
                <div class="kitchen-column">
                    <div class="kitchen-column-header"><h3 style="color:#60a5fa;">🔧 Preparing</h3><span class="count" id="preparingCount">0</span></div>
                    <div id="preparingOrders" style="max-height:200px; overflow-y:auto;"></div>
                </div>
                <div class="kitchen-column">
                    <div class="kitchen-column-header"><h3 style="color:#34d399;">✅ Ready</h3><span class="count" id="readyCount">0</span></div>
                    <div id="readyOrders" style="max-height:200px; overflow-y:auto;"></div>
                </div>
            </div>
            <div style="margin-top:20px; border-top:1px solid rgba(255,255,255,0.1); padding-top:16px;">
                <div style="display:flex; justify-content:space-between; align-items:center; cursor:pointer;" onclick="toggleKitchenCompleted()">
                    <h3 style="font-size:14px; color:rgba(255,255,255,0.6);">📜 Completed Orders <span id="kitchenCompletedCount">(0)</span></h3>
                    <span id="kitchenToggleIcon" style="color:rgba(255,255,255,0.4);">▶ Show</span>
                </div>
                <div id="completedOrders" style="max-height:50px; overflow-y:auto; display:none; margin-top:8px;">
                    <p class="text-muted text-center" style="padding:6px 0; font-size:11px;">Loading completed orders...</p>
                </div>
            </div>
        </div>
    `;
    loadKitchenOrders();
    refreshInterval = setInterval(loadKitchenOrders, 5000);
}

function toggleKitchenCompleted() {
    var container = document.getElementById('completedOrders');
    var icon = document.getElementById('kitchenToggleIcon');
    if (container.style.display === 'none') {
        container.style.display = 'block';
        icon.textContent = '▼ Hide';
    } else {
        container.style.display = 'none';
        icon.textContent = '▶ Show';
    }
}

async function loadKitchenOrders() {
    try {
        var res = await fetch('/api/kitchen-orders');
        var orders = await res.json();
        
        var foodOrders = orders.filter(function(o) {
            if (!o.order_items) return false;
            if (!o.order_items.length) return false;
            return o.order_items.some(function(item) {
                var category = item.menu_items?.category || item.category;
                return category === 'food';
            });
        });
        
        var completedOrders = foodOrders.filter(function(o) {
            return o.status === 'served' || o.status === 'billed';
        });
        
        renderKitchenColumn('pendingOrders', 'pendingCount', foodOrders.filter(function(o) {
            return o.status === 'pending';
        }), 'pending');
        renderKitchenColumn('preparingOrders', 'preparingCount', foodOrders.filter(function(o) {
            return o.status === 'preparing';
        }), 'preparing');
        renderKitchenColumn('readyOrders', 'readyCount', foodOrders.filter(function(o) {
            return o.status === 'ready';
        }), 'ready');
        
        renderCompletedOrders('completedOrders', completedOrders, 'kitchenCompletedCount');
        
    } catch (e) {
        console.error('Error loading kitchen orders:', e);
    }
}

function renderKitchenColumn(containerId, countId, orders, status) {
    var container = document.getElementById(containerId);
    var countEl = document.getElementById(countId);
    if (!container) return;
    if (countEl) countEl.textContent = orders.length;
    if (!orders.length) {
        container.innerHTML = '<p class="text-muted text-center" style="padding:12px 0; font-size:13px;">Nothing ' + status + '</p>';
        return;
    }
    
    container.innerHTML = orders.map(function(o) {
        var itemsHtml = '';
        if (o.order_items && o.order_items.length > 0) {
            itemsHtml = '<div style="margin:6px 0;">';
            for (var i = 0; i < o.order_items.length; i++) {
                var item = o.order_items[i];
                var category = item.menu_items?.category || item.category || '';
                if (category === 'food') {
                    var itemName = item.menu_items?.name || item.name || 'Item';
                    var itemQty = item.quantity || 1;
                    itemsHtml += '<span style="display:inline-block; background:rgba(255,255,255,0.06); padding:2px 10px; border-radius:12px; margin:2px 4px 2px 0; font-size:12px;">' + 
                        itemName + ' ×' + itemQty + 
                        '</span>';
                }
            }
            itemsHtml += '</div>';
        }
        
        var actionHtml = '';
        if (status === 'pending') {
            actionHtml = '<button class="btn-primary" style="padding:6px 16px; font-size:12px;" onclick="updateKitchenStatus(' + o.order_id + ', \'preparing\')">▶ Start</button>';
        } else if (status === 'preparing') {
            actionHtml = '<button class="btn-primary" style="padding:6px 16px; font-size:12px;" onclick="updateKitchenStatus(' + o.order_id + ', \'ready\')">✅ Mark Ready</button>';
        } else {
            actionHtml = '<span style="color:#34d399; font-size:13px;">✅ Ready for pickup</span>';
        }
        
        return '<div class="kitchen-order-card">' +
            '<div class="order-header"><span class="order-number">' + o.order_number + '</span><span class="order-time">' + new Date(o.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) + '</span></div>' +
            itemsHtml +
            '<div class="order-actions">' + actionHtml + '</div></div>';
    }).join('');
}

function renderCompletedOrders(containerId, orders, countId) {
    var container = document.getElementById(containerId);
    if (!container) return;
    
    var countEl = document.getElementById(countId);
    if (countEl) countEl.textContent = '(' + orders.length + ')';
    
    if (!orders.length) {
        container.innerHTML = '<p class="text-muted text-center" style="padding:4px 0; font-size:10px;">No completed orders</p>';
        return;
    }
    
    var recentOrders = orders.slice(-3);
    
    container.innerHTML = recentOrders.map(function(o) {
        var itemsHtml = '';
        if (o.order_items && o.order_items.length > 0) {
            itemsHtml = '';
            for (var i = 0; i < o.order_items.length; i++) {
                var item = o.order_items[i];
                var category = item.menu_items?.category || item.category || '';
                if (category === 'food' || category === 'beverage') {
                    var itemName = item.menu_items?.name || item.name || 'Item';
                    var itemQty = item.quantity || 1;
                    itemsHtml += '<span style="display:inline-block; background:rgba(255,255,255,0.03); padding:1px 5px; border-radius:3px; margin:1px 2px 1px 0; font-size:8px; color:rgba(255,255,255,0.35);">' + 
                        itemName + ' ×' + itemQty + 
                        '</span>';
                }
            }
        }
        
        var statusIcon = o.status === 'served' ? '✅' : '💰';
        
        return '<div style="display:flex; justify-content:space-between; align-items:center; padding:2px 6px; background:rgba(255,255,255,0.02); border-radius:3px; margin-bottom:1px; font-size:10px;">' +
            '<div><span style="color:rgba(255,255,255,0.2); font-size:8px;">' + o.order_number + '</span> ' + itemsHtml + '</div>' +
            '<div style="display:flex; align-items:center; gap:4px;">' +
            '<span style="color:rgba(255,255,255,0.2); font-size:9px;">KES ' + o.total_amount + '</span>' +
            '<span style="font-size:8px; color:rgba(255,255,255,0.2);">' + statusIcon + '</span>' +
            '</div>' +
            '</div>';
    }).join('');
}

async function updateKitchenStatus(orderId, status) {
    try {
        var res = await fetch('/api/update-order-status', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ order_id: orderId, status: status })
        });
        var data = await res.json();
        if (data.success) {
            if (status === 'ready') {
                alert('✅ Order marked as READY!\n\nTell the waiter it\'s ready for pickup.');
            }
            loadKitchenOrders();
        } else {
            alert('❌ Error: ' + data.message);
        }
    } catch (e) {
        alert('❌ Error updating status');
    }
}

// ============================================================
// BAR VIEW (BEVERAGES ONLY)
// ============================================================
function loadBarView() {
    document.getElementById('contentArea').innerHTML = `
        <div class="glass-card">
            <div class="flex-between" style="margin-bottom:20px;">
                <h3 style="font-size:18px; color:#6EE7B7;">🍺 Bar Display</h3>
                <span class="text-muted" style="font-size:12px;">Live updates every 5s</span>
            </div>
            <div class="kitchen-columns">
                <div class="kitchen-column">
                    <div class="kitchen-column-header"><h3 style="color:#fbbf24;">⏳ Pending</h3><span class="count" id="barPendingCount">0</span></div>
                    <div id="barPendingOrders" style="max-height:200px; overflow-y:auto;"></div>
                </div>
                <div class="kitchen-column">
                    <div class="kitchen-column-header"><h3 style="color:#60a5fa;">🔧 Preparing</h3><span class="count" id="barPreparingCount">0</span></div>
                    <div id="barPreparingOrders" style="max-height:200px; overflow-y:auto;"></div>
                </div>
                <div class="kitchen-column">
                    <div class="kitchen-column-header"><h3 style="color:#34d399;">✅ Ready</h3><span class="count" id="barReadyCount">0</span></div>
                    <div id="barReadyOrders" style="max-height:200px; overflow-y:auto;"></div>
                </div>
            </div>
            <div style="margin-top:20px; border-top:1px solid rgba(255,255,255,0.1); padding-top:16px;">
                <div style="display:flex; justify-content:space-between; align-items:center; cursor:pointer;" onclick="toggleBarCompleted()">
                    <h3 style="font-size:14px; color:rgba(255,255,255,0.6);">📜 Completed Orders <span id="barCompletedCount">(0)</span></h3>
                    <span id="barToggleIcon" style="color:rgba(255,255,255,0.4);">▶ Show</span>
                </div>
                <div id="barCompletedOrders" style="max-height:50px; overflow-y:auto; display:none; margin-top:8px;">
                    <p class="text-muted text-center" style="padding:6px 0; font-size:11px;">Loading completed orders...</p>
                </div>
            </div>
        </div>
    `;
    loadBarOrders();
    refreshInterval = setInterval(loadBarOrders, 5000);
}

function toggleBarCompleted() {
    var container = document.getElementById('barCompletedOrders');
    var icon = document.getElementById('barToggleIcon');
    if (container.style.display === 'none') {
        container.style.display = 'block';
        icon.textContent = '▼ Hide';
    } else {
        container.style.display = 'none';
        icon.textContent = '▶ Show';
    }
}

async function loadBarOrders() {
    try {
        var res = await fetch('/api/kitchen-orders');
        var orders = await res.json();
        
        var beverageOrders = orders.filter(function(o) {
            if (!o.order_items) return false;
            if (!o.order_items.length) return false;
            return o.order_items.some(function(item) {
                var category = item.menu_items?.category || item.category;
                return category === 'beverage';
            });
        });
        
        var completedBeverageOrders = beverageOrders.filter(function(o) {
            return o.status === 'served' || o.status === 'billed';
        });
        
        renderBarColumn('barPendingOrders', 'barPendingCount', beverageOrders.filter(function(o) {
            return o.status === 'pending';
        }), 'pending');
        renderBarColumn('barPreparingOrders', 'barPreparingCount', beverageOrders.filter(function(o) {
            return o.status === 'preparing';
        }), 'preparing');
        renderBarColumn('barReadyOrders', 'barReadyCount', beverageOrders.filter(function(o) {
            return o.status === 'ready';
        }), 'ready');
        
        renderCompletedOrders('barCompletedOrders', completedBeverageOrders, 'barCompletedCount');
        
    } catch (e) {
        console.error(e);
    }
}

function renderBarColumn(containerId, countId, orders, status) {
    var container = document.getElementById(containerId);
    var countEl = document.getElementById(countId);
    if (!container) return;
    if (countEl) countEl.textContent = orders.length;
    if (!orders.length) {
        container.innerHTML = '<p class="text-muted text-center" style="padding:12px 0; font-size:13px;">Nothing ' + status + '</p>';
        return;
    }
    
    container.innerHTML = orders.map(function(o) {
        var itemsHtml = '';
        if (o.order_items && o.order_items.length > 0) {
            itemsHtml = '<div style="margin:6px 0;">';
            for (var i = 0; i < o.order_items.length; i++) {
                var item = o.order_items[i];
                var category = item.menu_items?.category || item.category || '';
                if (category === 'beverage') {
                    var itemName = item.menu_items?.name || item.name || 'Item';
                    var itemQty = item.quantity || 1;
                    itemsHtml += '<span style="display:inline-block; background:rgba(255,255,255,0.06); padding:2px 10px; border-radius:12px; margin:2px 4px 2px 0; font-size:12px;">' + 
                        itemName + ' ×' + itemQty + 
                        '</span>';
                }
            }
            itemsHtml += '</div>';
        }
        
        var actionHtml = '';
        if (status === 'pending') {
            actionHtml = '<button class="btn-primary" style="padding:6px 16px; font-size:12px;" onclick="updateKitchenStatus(' + o.order_id + ', \'preparing\')">▶ Start</button>';
        } else if (status === 'preparing') {
            actionHtml = '<button class="btn-primary" style="padding:6px 16px; font-size:12px;" onclick="updateKitchenStatus(' + o.order_id + ', \'ready\')">✅ Mark Ready</button>';
        } else {
            actionHtml = '<span style="color:#34d399; font-size:13px;">✅ Ready for pickup</span>';
        }
        
        return '<div class="kitchen-order-card">' +
            '<div class="order-header"><span class="order-number">' + o.order_number + '</span><span class="order-time">' + new Date(o.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) + '</span></div>' +
            itemsHtml +
            '<div class="order-actions">' + actionHtml + '</div></div>';
    }).join('');
}

// ============================================================
// CASHIER VIEW
// ============================================================
function loadCashierView() {
    document.getElementById('contentArea').innerHTML = `
        <div class="glass-card">
            <h3 style="font-size:18px; color:#6EE7B7; margin-bottom:16px;">💰 Billing</h3>
            <div id="billingOrders"><p class="text-muted text-center" style="padding:20px 0;">Loading orders...</p></div>
        </div>
    `;
    loadBillingOrders();
    refreshInterval = setInterval(loadBillingOrders, 10000);
}

async function loadBillingOrders() {
    try {
        var res = await fetch('/api/all-orders');
        var orders = await res.json();
        var container = document.getElementById('billingOrders');
        if (!container) return;
        if (!orders.length) {
            container.innerHTML = '<p class="text-muted text-center" style="padding:20px 0;">No orders found</p>';
            return;
        }
        
        var html = '<table class="billing-table"><thead><tr><th>Order</th><th>Items Ordered</th><th>Total</th><th>Status</th><th>Payment</th><th>Action</th></tr></thead><tbody>';
        
        for (var i = 0; i < orders.length; i++) {
            var o = orders[i];
            var isPaid = (o.status === 'billed');
            var itemsList = '';
            
            if (o.order_items && o.order_items.length > 0) {
                var itemsArray = [];
                for (var j = 0; j < o.order_items.length; j++) {
                    var item = o.order_items[j];
                    var itemName = 'Item';
                    var itemQty = item.quantity || 1;
                    
                    if (item.menu_items) {
                        itemName = item.menu_items.name || 'Item';
                    } else if (item.name) {
                        itemName = item.name;
                    }
                    
                    itemsArray.push(itemQty + 'x ' + itemName);
                }
                itemsList = itemsArray.join('<br>');
            } else {
                itemsList = 'No items';
            }
            
            html = html + '<tr>';
            html = html + '<td><strong>' + o.order_number + '</strong></td>';
            html = html + '<td style="font-size:12px;">' + itemsList + '</td>';
            html = html + '<td style="color:#6EE7B7; font-weight:600;">KES ' + o.total_amount + '</td>';
            html = html + '<td><span class="badge badge-' + o.status + '">' + o.status + '</span></td>';
            html = html + '<td><span class="badge badge-' + (isPaid ? 'paid' : 'unpaid') + '">' + (isPaid ? '✅ Paid' : '⏳ Unpaid') + '</span></td>';
            
            if (!isPaid) {
                html = html + '<td><button class="btn-primary" style="padding:6px 16px; font-size:12px;" onclick="markAsPaid(' + o.order_id + ')">💳 Pay</button></td>';
            } else {
                html = html + '<td>✅</td>';
            }
            
            html = html + '</tr>';
        }
        
        html = html + '</tbody></table>';
        container.innerHTML = html;
    } catch (e) {
        console.error('Error:', e);
        var container = document.getElementById('billingOrders');
        if (container) {
            container.innerHTML = '<p class="text-muted text-center" style="padding:20px 0;">Error loading orders</p>';
        }
    }
}

async function markAsPaid(orderId) {
    if (!confirm('Mark this order as paid?')) return;
    try {
        await fetch('/api/mark-paid', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ order_id: orderId }) });
        loadBillingOrders();
    } catch (e) {
        alert('Error marking as paid');
    }
}

// ============================================================
// ADMIN VIEW (NO CHARTS - WORKING)
// ============================================================
function loadAdminView() {
    document.getElementById('contentArea').innerHTML = `
        <div class="glass-card">
            <h3 style="font-size:18px; color:#6EE7B7; margin-bottom:16px;">👑 Admin Dashboard</h3>
            <div class="stats-grid">
                <div class="stat-card"><div class="number" id="statRevenue">—</div><div class="label">Total Revenue</div></div>
                <div class="stat-card"><div class="number" id="statOrders">—</div><div class="label">Total Orders</div></div>
                <div class="stat-card"><div class="number" id="statActive">—</div><div class="label">Active Orders</div></div>
                <div class="stat-card"><div class="number" id="statBilled">—</div><div class="label">Billed Orders</div></div>
            </div>
            
            <div style="display:grid; grid-template-columns:1fr 1fr 1fr; gap:16px; margin-bottom:20px;">
                <div class="stat-card"><div class="number" id="statMostBought">—</div><div class="label">Most Bought Item</div></div>
                <div class="stat-card"><div class="number" id="statTotalItems">—</div><div class="label">Total Items Sold</div></div>
                <div class="stat-card"><div class="number" id="statAvgOrder">—</div><div class="label">Avg Order Value</div></div>
            </div>
            
            <div class="admin-tabs">
                <button class="active" onclick="switchAdminTab('menu')">📋 Menu</button>
                <button onclick="switchAdminTab('users')">👥 Users</button>
                <button onclick="switchAdminTab('orders')">📦 Orders</button>
            </div>
            <div id="adminMenuTab" class="tab-content active">Loading...</div>
            <div id="adminUsersTab" class="tab-content"></div>
            <div id="adminOrdersTab" class="tab-content"></div>
        </div>
    `;
    loadAdminStats();
    loadAdminMenuTab();
    loadAdminAnalytics();
    refreshInterval = setInterval(function() {
        loadAdminStats();
        loadAdminAnalytics();
    }, 30000);
}

async function loadAdminStats() {
    try {
        var res = await fetch('/api/all-orders');
        var orders = await res.json();
        var totalRevenue = 0,
            billed = 0,
            active = 0;
        orders.forEach(function(o) {
            var isPaid = o.transactions?.[0]?.payment_status === 'paid' || o.status === 'billed';
            if (isPaid) {
                totalRevenue += o.total_amount || 0;
                billed++;
            }
            if (o.status !== 'billed' && o.status !== 'served') {
                active++;
            }
        });
        document.getElementById('statRevenue').textContent = 'KES ' + totalRevenue.toFixed(0);
        document.getElementById('statOrders').textContent = orders.length;
        document.getElementById('statActive').textContent = active;
        document.getElementById('statBilled').textContent = billed;
    } catch (e) {
        console.error(e);
    }
}

function loadAdminAnalytics() {
    try {
        fetch('/api/all-orders')
            .then(function(res) { return res.json(); })
            .then(function(orders) {
                if (!orders || !orders.length) {
                    document.getElementById('statMostBought').textContent = '—';
                    document.getElementById('statTotalItems').textContent = '0';
                    document.getElementById('statAvgOrder').textContent = 'KES 0';
                    return;
                }
                
                var itemCounts = {};
                var totalItems = 0;
                
                for (var i = 0; i < orders.length; i++) {
                    var o = orders[i];
                    if (!o.order_items) continue;
                    
                    for (var j = 0; j < o.order_items.length; j++) {
                        var item = o.order_items[j];
                        var itemName = 'Item';
                        var qty = item.quantity || 1;
                        
                        if (item.menu_items) {
                            itemName = item.menu_items.name || 'Item';
                        } else if (item.name) {
                            itemName = item.name;
                        }
                        
                        totalItems += qty;
                        
                        if (itemCounts[itemName]) {
                            itemCounts[itemName] += qty;
                        } else {
                            itemCounts[itemName] = qty;
                        }
                    }
                }
                
                var mostBought = '';
                var maxCount = 0;
                for (var name in itemCounts) {
                    if (itemCounts[name] > maxCount) {
                        maxCount = itemCounts[name];
                        mostBought = name + ' (' + maxCount + 'x)';
                    }
                }
                
                document.getElementById('statMostBought').textContent = mostBought || '—';
                document.getElementById('statTotalItems').textContent = totalItems;
                
                var totalRevenue = 0;
                for (var k = 0; k < orders.length; k++) {
                    totalRevenue += orders[k].total_amount || 0;
                }
                var avgOrder = orders.length > 0 ? Math.round(totalRevenue / orders.length) : 0;
                document.getElementById('statAvgOrder').textContent = 'KES ' + avgOrder;
            })
            .catch(function(e) {
                console.error('Analytics error:', e);
            });
    } catch(e) {
        console.error(e);
    }
}

function switchAdminTab(tab) {
    currentAdminTab = tab;
    document.querySelectorAll('.admin-tabs button').forEach(function(b) {
        b.classList.remove('active');
    });
    document.querySelectorAll('.tab-content').forEach(function(c) {
        c.classList.remove('active');
    });
    var btns = document.querySelectorAll('.admin-tabs button');
    var tabMap = { menu: 0, users: 1, orders: 2 };
    if (btns[tabMap[tab]]) btns[tabMap[tab]].classList.add('active');
    var contentMap = { menu: 'adminMenuTab', users: 'adminUsersTab', orders: 'adminOrdersTab' };
    var el = document.getElementById(contentMap[tab]);
    if (el) {
        el.classList.add('active');
        if (tab === 'menu') loadAdminMenuTab();
        else if (tab === 'users') loadAdminUsersTab();
        else if (tab === 'orders') loadAdminOrdersTab();
    }
}

async function loadAdminMenuTab() {
    var container = document.getElementById('adminMenuTab');
    if (!container) return;
    container.innerHTML = `
        <div class="add-menu-form">
            <input type="text" id="itemName" placeholder="Item name">
            <input type="number" id="itemPrice" placeholder="Price">
            <select id="itemCategory">
                <option value="food">Food</option>
                <option value="beverage">Beverage</option>
            </select>
            <button class="btn-primary" onclick="addMenuItem()">➕ Add</button>
        </div>
        <div id="adminMenuList">Loading...</div>
    `;
    try {
        var res = await fetch('/api/menu');
        var items = await res.json();
        var list = document.getElementById('adminMenuList');
        if (!items.length) {
            list.innerHTML = '<p class="text-muted text-center" style="padding:20px 0;">No menu items</p>';
            return;
        }
        list.innerHTML = '<div class="menu-management-grid">' + items.map(function(item) {
            return '<div class="menu-management-item"><div class="info"><div class="name">' + item.name + '</div><div class="price">KES ' + item.price + '</div><div class="category">' + item.category + '</div></div><button class="btn-danger" style="padding:4px 12px; font-size:12px;" onclick="deleteMenuItem(' + item.item_id + ')">✕</button></div>';
        }).join('') + '</div>';
    } catch (e) {
        console.error(e);
    }
}

async function addMenuItem() {
    var name = document.getElementById('itemName')?.value.trim();
    var price = document.getElementById('itemPrice')?.value;
    var category = document.getElementById('itemCategory')?.value;
    if (!name || !price) {
        alert('Please fill in name and price');
        return;
    }
    try {
        var res = await fetch('/api/add-menu-item', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name: name, price: parseFloat(price), category: category, description: '' })
        });
        var data = await res.json();
        if (data.success) {
            document.getElementById('itemName').value = '';
            document.getElementById('itemPrice').value = '';
            loadAdminMenuTab();
        } else {
            alert('Error: ' + data.message);
        }
    } catch (e) {
        alert('Network error');
    }
}

async function deleteMenuItem(itemId) {
    if (!confirm('❌ Delete this menu item permanently?')) return;
    try {
        var res = await fetch('/api/delete-menu-item', {
            method: 'DELETE',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ item_id: itemId })
        });
        var data = await res.json();
        if (data.success) {
            alert('✅ Menu item deleted successfully!');
            loadAdminMenuTab();
        } else {
            alert('❌ Error: ' + data.message);
        }
    } catch (e) {
        alert('❌ Network error');
    }
}

// ============================================================
// ADMIN: USERS TAB
// ============================================================
async function loadAdminUsersTab() {
    var container = document.getElementById('adminUsersTab');
    if (!container) return;
    
    container.innerHTML = `
        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:16px;">
            <h4 style="font-size:16px; color:#6EE7B7;">👥 User Management</h4>
            <button class="btn-primary" onclick="showAllUsers()" style="padding:8px 20px; font-size:12px;">👀 View All Users</button>
        </div>
        <div id="pendingUsersList">Loading...</div>
        <div id="allUsersList" style="display:none; margin-top:16px;">
            <h4 style="font-size:14px; color:rgba(255,255,255,0.6); margin-bottom:12px;">All Active Users</h4>
            <div id="allUsersContainer">Loading...</div>
        </div>
    `;
    loadPendingUsers();
}

async function loadPendingUsers() {
    var container = document.getElementById('pendingUsersList');
    if (!container) return;
    
    try {
        var res = await fetch('/api/pending-users');
        var users = await res.json();
        
        if (!users.length) {
            container.innerHTML = '<p class="text-muted" style="padding:12px 0;">✅ No pending users</p>';
            return;
        }
        
        container.innerHTML = users.map(function(u) {
            return '<div class="flex-between" style="padding:12px 0; border-bottom:1px solid rgba(255,255,255,0.06);">' +
                '<div><strong>' + u.full_name + '</strong><span class="text-muted" style="font-size:12px; margin-left:8px;">@' + u.username + '</span><span class="badge" style="background:rgba(110,231,183,0.1); color:#6EE7B7; font-size:10px;">' + u.role + '</span></div>' +
                '<div style="display:flex; gap:8px;">' +
                '<button class="btn-primary" style="padding:4px 16px; font-size:12px;" onclick="approveUser(' + u.user_id + ')">✅ Approve</button>' +
                '<button class="btn-danger" style="padding:4px 16px; font-size:12px;" onclick="deleteUser(' + u.user_id + ')">🗑️ Delete</button>' +
                '</div></div>';
        }).join('');
    } catch (e) {
        console.error(e);
        container.innerHTML = '<p class="text-muted">Error loading pending users</p>';
    }
}

function showAllUsers() {
    var container = document.getElementById('allUsersList');
    if (container.style.display === 'none') {
        container.style.display = 'block';
        loadAllUsers();
    } else {
        container.style.display = 'none';
    }
}

async function loadAllUsers() {
    var container = document.getElementById('allUsersContainer');
    if (!container) return;
    
    try {
        var res = await fetch('/api/all-users');
        var users = await res.json();
        
        if (!users.length) {
            container.innerHTML = '<p class="text-muted" style="padding:12px 0;">No users found</p>';
            return;
        }
        
        container.innerHTML = users.map(function(u) {
            return '<div class="flex-between" style="padding:10px 0; border-bottom:1px solid rgba(255,255,255,0.04);">' +
                '<div><strong>' + u.full_name + '</strong><span class="text-muted" style="font-size:12px; margin-left:8px;">@' + u.username + '</span><span class="badge" style="background:rgba(110,231,183,0.1); color:#6EE7B7; font-size:9px;">' + u.role + '</span></div>' +
                '<div style="display:flex; gap:6px;">' +
                '<button class="btn-primary" style="padding:2px 12px; font-size:10px;" onclick="resetUserPassword(' + u.user_id + ', \'' + u.username + '\')">🔑 Reset</button>' +
                '<button class="btn-danger" style="padding:2px 12px; font-size:10px;" onclick="deleteUser(' + u.user_id + ')">🗑️</button>' +
                '</div></div>';
        }).join('');
    } catch (e) {
        console.error(e);
        container.innerHTML = '<p class="text-muted">Error loading users</p>';
    }
}

async function approveUser(userId) {
    var pwd = prompt('Set password for user:', 'waiter123');
    if (!pwd) return;
    try {
        var res = await fetch('/api/approve-user', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ user_id: userId, password: pwd })
        });
        var data = await res.json();
        if (data.success) {
            alert('✅ User approved!');
            loadAdminUsersTab();
        } else {
            alert('Error: ' + (data.error || data.message));
        }
    } catch (e) {
        alert('Network error');
    }
}

async function resetUserPassword(userId, username) {
    var newPassword = prompt('Reset password for @' + username + ':\n\nEnter new password:', 'waiter123');
    if (!newPassword) return;
    
    if (newPassword.length < 4) {
        alert('❌ Password must be at least 4 characters');
        return;
    }
    
    try {
        var res = await fetch('/api/reset-password', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ user_id: userId, password: newPassword })
        });
        var data = await res.json();
        if (data.success) {
            alert('✅ Password reset successful for @' + username + '!\n\nNew password: ' + newPassword);
            loadAllUsers();
        } else {
            alert('❌ Error: ' + (data.error || data.message));
        }
    } catch (e) {
        alert('❌ Network error. Please try again.');
    }
}

async function deleteUser(userId) {
    if (!confirm('⚠️ WARNING: This will delete the user and ALL their orders permanently!\n\nAre you sure?')) return;
    
    try {
        var res = await fetch('/api/delete-user', {
            method: 'DELETE',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ user_id: userId })
        });
        var data = await res.json();
        if (data.success) {
            alert('✅ User deleted successfully!');
            loadAdminUsersTab();
        } else {
            alert('❌ Error: ' + (data.error || data.message));
        }
    } catch (e) {
        console.error('Delete user error:', e);
        alert('❌ Network error. Please try again.');
    }
}

// ============================================================
// ADMIN: ORDERS TAB
// ============================================================
async function loadAdminOrdersTab() {
    var container = document.getElementById('adminOrdersTab');
    if (!container) return;
    container.innerHTML = '<p class="text-muted" style="padding:20px 0;">Loading orders...</p>';
    try {
        var res = await fetch('/api/all-orders');
        var orders = await res.json();
        if (!orders.length) {
            container.innerHTML = '<p class="text-muted" style="padding:20px 0;">No orders found</p>';
            return;
        }
        var html = '<table class="order-log-table"><thead><tr><th>Order</th><th>Items (Qty)</th><th>Total</th><th>Status</th><th>Created</th><th>Waiter</th></tr></thead><tbody>';
        
        orders.slice(0, 50).forEach(function(o) {
            var time = new Date(o.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
            
            var itemsList = '';
            if (o.order_items && o.order_items.length > 0) {
                var itemsArray = [];
                for (var i = 0; i < o.order_items.length; i++) {
                    var item = o.order_items[i];
                    var name = 'Item';
                    if (item.menu_items) {
                        name = item.menu_items.name || 'Item';
                    } else if (item.name) {
                        name = item.name;
                    }
                    var qty = item.quantity || 1;
                    itemsArray.push(qty + 'x ' + name);
                }
                itemsList = itemsArray.join(', ');
            }
            
            html += '<tr>' +
                '<td><strong>' + o.order_number + '</strong></td>' +
                '<td style="font-size:12px;">' + itemsList + '</td>' +
                '<td style="color:#6EE7B7;">KES ' + o.total_amount + '</td>' +
                '<td><span class="badge badge-' + o.status + '">' + o.status + '</span></td>' +
                '<td class="text-muted" style="font-size:12px;">' + time + '</td>' +
                '<td style="font-size:12px;">' + (o.waiter_name || '—') + '</td>' +
                '</tr>';
        });
        html += '</tbody></table>';
        container.innerHTML = html;
    } catch (e) {
        console.error(e);
        container.innerHTML = '<p class="text-muted">Error loading orders</p>';
    }
}

// ============================================================
// LIVE ORDERS VIEW
// ============================================================
function loadLiveOrdersView() {
    document.getElementById('contentArea').innerHTML = `
        <div class="glass-card">
            <div class="flex-between" style="margin-bottom:16px;">
                <h3 style="font-size:18px; color:#6EE7B7;"><span class="live-dot"></span> Live Orders</h3>
                <span class="text-muted" style="font-size:12px;">Auto-refresh every 5s</span>
            </div>
            <div id="liveOrdersContainer"><p class="text-muted text-center" style="padding:20px 0;">Loading...</p></div>
        </div>
    `;
    loadLiveOrders();
    refreshInterval = setInterval(loadLiveOrders, 5000);
}

async function loadLiveOrders() {
    try {
        var res = await fetch('/api/all-active-orders');
        var orders = await res.json();
        var container = document.getElementById('liveOrdersContainer');
        if (!container) return;
        
        if (lastOrderCount > 0 && orders.length > lastOrderCount) {
            alert('🔔 New order received!');
        }
        lastOrderCount = orders.length;
        
        if (!orders.length) {
            container.innerHTML = '<p class="text-muted text-center" style="padding:20px 0;">No active orders</p>';
            return;
        }
        
        container.innerHTML = orders.map(function(o) {
            var itemsHtml = '';
            if (o.order_items && o.order_items.length > 0) {
                itemsHtml = '<div style="margin:6px 0;">';
                for (var i = 0; i < o.order_items.length; i++) {
                    var item = o.order_items[i];
                    var name = 'Item';
                    var qty = item.quantity || 1;
                    var price = 0;
                    
                    if (item.menu_items) {
                        name = item.menu_items.name || 'Item';
                        price = item.menu_items.price || 0;
                    } else if (item.name) {
                        name = item.name;
                        price = item.price || 0;
                    }
                    
                    var subtotal = qty * price;
                    itemsHtml += '<span style="display:inline-block; background:rgba(255,255,255,0.06); padding:2px 10px; border-radius:12px; margin:2px 4px 2px 0; font-size:12px;">' + 
                        name + ' ×' + qty + ' (KES ' + subtotal + ')' +
                        '</span>';
                }
                itemsHtml += '</div>';
            }
            
            return '<div class="kitchen-order-card" style="border-left-color: ' + (o.status === 'ready' ? '#34d399' : '#fbbf24') + ';">' +
                '<div class="order-header"><span class="order-number">' + o.order_number + '</span><div class="flex-center"><span class="badge badge-' + o.status + '">' + o.status + '</span><span class="order-time">' + new Date(o.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) + '</span></div></div>' +
                itemsHtml +
                '<div style="display:flex; justify-content:space-between; align-items:center; font-size:13px;">' +
                '<span style="color:#6EE7B7; font-weight:600;">KES ' + o.total_amount + '</span>' +
                '<span style="font-size:12px; color:rgba(255,255,255,0.4);">⏱️ ' + (o.eta_display || 'Calculating...') + '</span>' +
                '</div>' +
                '<div style="margin-top:8px; font-size:12px; color:rgba(255,255,255,0.4);">👤 Waiter: ' + (o.waiter_name || 'Unknown') + '</div>' +
                (o.table_number ? '<div style="font-size:12px; color:rgba(255,255,255,0.4);">📋 Table: ' + o.table_number + '</div>' : '') +
                (o.room_number ? '<div style="font-size:12px; color:rgba(255,255,255,0.4);">🏨 Room: ' + o.room_number + '</div>' : '') +
                '</div>';
        }).join('');
    } catch (e) {
        console.error(e);
        var container = document.getElementById('liveOrdersContainer');
        if (container) {
            container.innerHTML = '<p class="text-muted">Error loading live orders</p>';
        }
    }
}