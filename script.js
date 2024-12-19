// Get references to common elements 
const messageContainer = document.getElementById("message-container");
const usernameDisplay = document.getElementById("username-display");
const logoutButton = document.getElementById("logout-button");
const productContainer = document.getElementById("product-container");
const orderHistoryContainer = document.getElementById("order-history");

// Mock Database
let database = JSON.parse(localStorage.getItem("userDatabase")) || [];
let currentUser = localStorage.getItem("currentUser");
let cart = JSON.parse(localStorage.getItem("cart")) || [];
let orders = JSON.parse(localStorage.getItem("orders")) || [];

// Membership Logic
const membershipTiers = {
    bronze: {shipping: 1 },
    silver: {shipping: 0.75 },
    gold: {shipping: 0.5 },
    platinum: { shipping: 0 }
};

// Normalize the cart items to ensure consistent data types for `id`
cart = cart.map(item => ({
    ...item,
    id: typeof item.id === "string" ? parseInt(item.id, 10) : item.id
}));

document.addEventListener('DOMContentLoaded', () => {
    // Ensure user is signed in
    if (!currentUser && !window.location.pathname.includes("signin") && !window.location.pathname.includes("signup")) {
        window.location.href = "signin.html";
    }

    // Display Username and Membership
    if (usernameDisplay && currentUser) {
        const user = getUserData();
        if (user) {
            usernameDisplay.textContent = `${user.username} (${user.membership})`;
        }
    }

    // Logout functionality
    if (logoutButton) {
        logoutButton.addEventListener("click", () => {
            localStorage.removeItem("currentUser");
            window.location.href = "signin.html";
        });
    }

    // Checkout Page logic
    const checkoutContainer = document.getElementById("checkout-summary");
    const confirmOrderButton = document.getElementById("confirm-order");

    if (!checkoutContainer) {
        console.error("Checkout summary container not found!");
        return;
    }

    if (!confirmOrderButton) {
        console.error("Confirm order button not found!");
        return;
    }

    // Handle Empty Cart
    if (cart.length === 0) {
        displayMessage("Your cart is empty. Add items before proceeding to checkout.", true);
        checkoutContainer.innerHTML = `<p>Your cart is empty. Add items before proceeding to checkout.</p>`;
        return;
    }

    // Calculate Cart Summary
    const user = getUserData();
    const membership = user ? user.membership : "bronze"; // Default to 'bronze' if user has no membership
    let totalCost = 0;
    let totalQuantity = 0;  // Track total quantity of items for shipping calculation

    // Check for valid cart data (price and quantity must be numbers)
    const isValidCart = cart.every(item =>
        item && typeof item.price === "number" && typeof item.quantity === "number"
    );

    // If cart is invalid, show error and reset the cart
    if (!isValidCart) {
        displayMessage("Cart data is invalid. Please try adding items again.", true);
        localStorage.removeItem("cart");
    } else {
        // Calculate total cost and total quantity for shipping
        cart.forEach(item => {
            const itemPrice = item.price; // Apply membership price discount
            totalCost += item.quantity * itemPrice; // Add the item cost to the total
            totalQuantity += item.quantity;  // Add item quantity to the total for shipping calculation
        });

        // Calculate shipping cost based on membership and total quantity
        const shipping = membershipTiers[membership].shipping * totalQuantity; // Multiply by total items

        // Display the calculated totals
        checkoutContainer.innerHTML = `
            <p>Subtotal: £${totalCost.toFixed(2)}</p>
            <p>Shipping: £${shipping.toFixed(2)}</p>
            <p><strong>Total: £${(totalCost + shipping).toFixed(2)}</strong></p>
        `;

        // Handle order confirmation on click
        confirmOrderButton.addEventListener("click", () => {
            // Generate new order ID by incrementing the stored value
            let lastOrderID = parseInt(localStorage.getItem("lastOrderID")) || 0;
            const newOrderID = lastOrderID + 1; // Increment the order ID

            // Save the new order ID back to localStorage
            localStorage.setItem("lastOrderID", newOrderID);

            // Create new order
            const newOrder = {
                id: newOrderID,
                user: currentUser,
                cart: cart,
                total: totalCost,
                shipping: shipping
            };

            // Add the new order to localStorage
            orders.push(newOrder);
            localStorage.setItem("orders", JSON.stringify(orders));

            // Clear cart after order is placed
            localStorage.removeItem("cart");

            // Display success message
            displayMessage("Order confirmed! Thank you.");

            // Redirect after a short delay
            setTimeout(() => window.location.href = "profile.html", 1500);
        });
    }

    // Display user's order history
    const userOrders = orders.filter(order => order.user === currentUser); // Filter orders for the current user

    if (userOrders.length === 0) {
        orderHistoryContainer.innerHTML = "<p>You have no orders yet.</p>";
    } else {
        userOrders.forEach(order => {
            const orderElement = document.createElement("div");
            orderElement.classList.add("order");

            // Calculate points earned (money spent - shipping) / 100, rounded down
            const pointsEarned = Math.floor((order.total - order.shipping) / 100);

            // Create order summary
            let orderDetails = `
                <p><strong>Order ID:</strong> ${order.id}</p>
                <p><strong>Total:</strong> £${(order.total + order.shipping).toFixed(2)}</p>
                <p><strong>Shipping:</strong> £${order.shipping.toFixed(2)}</p>
                <p><strong>Points Earned:</strong> ${pointsEarned} points</p>
                <p><strong>Items:</strong></p>
                <ul>
            `;

            order.cart.forEach(item => {
                orderDetails += `
                    <li>${item.title} (x${item.quantity}) - £${(item.price * item.quantity).toFixed(2)}</li>
                `;
            });

            orderDetails += `</ul><hr>`;

            // Add order details to the page
            orderElement.innerHTML = orderDetails;
            orderHistoryContainer.appendChild(orderElement);
        });
    }
});

// Fetch current user data
function getUserData() {
    return database.find(user => user.username === currentUser) || null;
}

// Display a message on the screen
function displayMessage(message, isError = false) {
    if (messageContainer) {
        messageContainer.textContent = message;
        messageContainer.style.color = isError ? "red" : "green";
    }
}

// Fetch Products from API (Fakestore API)
function fetchProducts() {
    fetch("https://fakestoreapi.com/products")
        .then(response => response.json())
        .then(products => {
            products.forEach(product => {
                const productElement = document.createElement("div");
                productElement.classList.add("product");
                productElement.innerHTML = `
                    <img src="${product.image}" alt="${product.title}">
                    <h3>${product.title}</h3>
                    <p>Price: £${product.price.toFixed(2)}</p>
                    <button class="add-to-cart" data-id="${product.id}" data-title="${product.title}" data-price="${product.price}">Add to Cart</button>
                `;
                productContainer.appendChild(productElement);
            });
        })
        .catch(() => displayMessage("Error fetching products.", true));
}

// Add to Cart functionality
document.addEventListener("click", (e) => {
    if (e.target.classList.contains("add-to-cart")) {
        const id = e.target.getAttribute("data-id");
        const title = e.target.getAttribute("data-title");
        const price = parseFloat(e.target.getAttribute("data-price"));

        const existingItem = cart.find(item => item.id === id);
        if (existingItem) {
            existingItem.quantity += 1;
        } else {
            cart.push({ id, title, price, quantity: 1 });
        }

        localStorage.setItem("cart", JSON.stringify(cart));
        displayMessage(`${title} added to your cart.`);
    }
});

// Function to update the cart item count
function updateCartCount() {
    const cartItemCount = document.getElementById("cart-item-count");
    const cart = JSON.parse(localStorage.getItem("cart")) || [];
    const totalItems = cart.reduce((sum, item) => sum + item.quantity, 0); // Sum all item quantities
    cartItemCount.textContent = totalItems; // Update the cart count
}

// Update the cart count whenever an item is added
document.addEventListener("click", (e) => {
    if (e.target.classList.contains("add-to-cart")) {
        const id = e.target.getAttribute("data-id");
        const title = e.target.getAttribute("data-title");
        const price = parseFloat(e.target.getAttribute("data-price"));

        // Add item to the cart
        const cart = JSON.parse(localStorage.getItem("cart")) || [];
        const existingItem = cart.find(item => item.id === id);
        if (existingItem) {
            existingItem.quantity += 1; // Increase quantity if item already exists
        } else {
            cart.push({ id, title, price, quantity: 1 }); // Add new item to the cart
        }

        localStorage.setItem("cart", JSON.stringify(cart)); // Save updated cart to localStorage
        updateCartCount(); // Update the cart icon count
        displayMessage(`${title} added to your cart.`);
    }
});

// Call the updateCartCount function on page load to display the initial cart count
document.addEventListener("DOMContentLoaded", () => {
    updateCartCount(); // Initialize the cart item count on page load
});

document.addEventListener('DOMContentLoaded', () => {
    const checkoutButton = document.getElementById("checkout-button");

    if (checkoutButton) {
        checkoutButton.addEventListener("click", () => {
            window.location.href = "checkout.html"; // Redirect to checkout page
        });
    }
});

// Initial fetch of products when the page loads
if (productContainer) {
    fetchProducts();
}
