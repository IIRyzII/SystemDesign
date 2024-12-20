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
    bronze: { shipping: 1 },
    silver: { shipping: 0.75 },
    gold: { shipping: 0.5 },
    platinum: { shipping: 0 }
};

// Normalize the cart items to ensure consistent data types for `id`
cart = cart.map(item => ({
    ...item,
    id: typeof item.id === "string" ? parseInt(item.id, 10) : item.id
}));

// Display Messages Helper
function displayMessage(message, isError = false) {
    if (messageContainer) {
        messageContainer.textContent = message;
        messageContainer.style.color = isError ? "red" : "green";
    }
}

// Fetch current user data
function getUserData() {
    return database.find(user => user.username === currentUser) || null;
}

// Update the cart item count
function updateCartCount() {
    const cartItemCount = document.getElementById("cart-item-count");
    const totalItems = cart.reduce((sum, item) => sum + item.quantity, 0); // Sum all item quantities
    if (cartItemCount) cartItemCount.textContent = totalItems; // Update the cart count
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

// DOMContentLoaded Event
document.addEventListener("DOMContentLoaded", () => {
    // Redirect if not signed in
    if (!currentUser && !["signin.html", "signup.html"].some(path => window.location.pathname.includes(path))) {
        window.location.href = "signin.html";
    }

    // Update username display
    if (usernameDisplay && currentUser) {
        const user = getUserData();
        if (user) usernameDisplay.textContent = `${user.username} (${user.membership})`;
    }

    // Initialize logout button
    if (logoutButton) {
        logoutButton.addEventListener("click", () => {
            localStorage.removeItem("currentUser");
            window.location.href = "signin.html";
        });
    }

    // Initialize checkout logic
    const checkoutContainer = document.getElementById("checkout-summary");
    const confirmOrderButton = document.getElementById("confirm-order");
    const deliveryAddressInput = document.getElementById("delivery-address");
    const paymentMethodSelect = document.getElementById("payment-method");

    if (checkoutContainer && confirmOrderButton) {
        // Handle empty cart
        if (cart.length === 0) {
            displayMessage("Your cart is empty. Add items before proceeding to checkout.", true);
            checkoutContainer.innerHTML = `<p>Your cart is empty. Add items before proceeding to checkout.</p>`;
        } else {
            const user = getUserData();
            const membership = user ? user.membership : "bronze";
            let totalCost = 0, totalQuantity = 0;

            // Validate cart data
            if (cart.every(item => item && typeof item.price === "number" && typeof item.quantity === "number")) {
                cart.forEach(item => {
                    totalCost += item.quantity * item.price;
                    totalQuantity += item.quantity;
                });

                const shipping = membershipTiers[membership].shipping * totalQuantity;
                checkoutContainer.innerHTML = `
                    <p>Subtotal: £${totalCost.toFixed(2)}</p>
                    <p>Shipping: £${shipping.toFixed(2)}</p>
                    <p><strong>Total: £${(totalCost + shipping).toFixed(2)}</strong></p>
                `;

                confirmOrderButton.addEventListener("click", () => {
                    const deliveryAddress = deliveryAddressInput.value.trim();
                    const paymentMethod = paymentMethodSelect.value;

                    // Validate delivery address
                    if (!deliveryAddress) {
                        displayMessage("Please enter a delivery address.", true);
                        return;
                    }

                    // Validate payment method
                    if (!paymentMethod) {
                        displayMessage("Please select a payment method.", true);
                        return;
                    }

                    const newOrderID = (parseInt(localStorage.getItem("lastOrderID")) || 0) + 1;
                    localStorage.setItem("lastOrderID", newOrderID);

                    const newOrder = {
                        id: newOrderID,
                        user: currentUser,
                        cart,
                        total: totalCost,
                        shipping,
                        deliveryAddress,
                        paymentMethod
                    };
                    orders.push(newOrder);
                    localStorage.setItem("orders", JSON.stringify(orders));
                    localStorage.removeItem("cart");

                    displayMessage("Order confirmed! Thank you.");
                    setTimeout(() => window.location.href = "profile.html", 1500);
                });
            } else {
                displayMessage("Cart data is invalid. Please try adding items again.", true);
                localStorage.removeItem("cart");
            }
        }
    }

    // Display order history
    if (orderHistoryContainer) {
        const userOrders = orders.filter(order => order.user === currentUser);

        if (userOrders.length === 0) {
            orderHistoryContainer.innerHTML = "<p>You have no orders yet.</p>";
        } else {
            userOrders.forEach(order => {
                const orderElement = document.createElement("div");
                orderElement.classList.add("order");

                const pointsEarned = Math.floor((order.total - order.shipping) / 100);
                let orderDetails = `
                    <p><strong>Order ID:</strong> ${order.id}</p>
                    <p><strong>Total:</strong> £${(order.total + order.shipping).toFixed(2)}</p>
                    <p><strong>Shipping:</strong> £${order.shipping.toFixed(2)}</p>
                    <p><strong>Delivery Address:</strong> ${order.deliveryAddress || "Not provided"}</p>
                    <p><strong>Payment Method:</strong> ${order.paymentMethod || "Not selected"}</p>
                    <p><strong>Points Earned:</strong> ${pointsEarned} points</p>
                    <p><strong>Items:</strong></p>
                    <ul>
                `;

                order.cart.forEach(item => {
                    orderDetails += `<li>${item.title} (x${item.quantity}) - £${(item.price * item.quantity).toFixed(2)}</li>`;
                });

                orderDetails += `</ul><hr>`;
                orderElement.innerHTML = orderDetails;
                orderHistoryContainer.appendChild(orderElement);
            });
        }
    }

    // Initialize cart count and fetch products
    updateCartCount();
    if (productContainer) fetchProducts();
});

// Sign Up Logic
const signupForm = document.getElementById("signup-form");
if (signupForm) {
    signupForm.addEventListener("submit", (e) => {
        e.preventDefault();
        const username = document.getElementById("signup-username").value.trim();
        const password = document.getElementById("signup-password").value;

        if (database.some(user => user.username === username)) {
            displayMessage("Username already exists. Please sign in.", true);
        } else {
            database.push({ username, password, membership: "bronze", points: 0 });
            localStorage.setItem("userDatabase", JSON.stringify(database));
            displayMessage("Sign Up successful! You can now sign in.");
            setTimeout(() => (window.location.href = "signin.html"), 1500);
        }
    });
}

// Sign In Logic
const signinForm = document.getElementById("signin-form");
if (signinForm) {
    signinForm.addEventListener("submit", (e) => {
        e.preventDefault();
        const username = document.getElementById("signin-username").value.trim();
        const password = document.getElementById("signin-password").value;

        const user = database.find(user => user.username === username && user.password === password);
        if (user) {
            localStorage.setItem("currentUser", username);
            displayMessage(`Welcome back, ${username}!`);
            setTimeout(() => (window.location.href = "Shop.html"), 1500);
        } else {
            displayMessage("Invalid credentials. Please try again.", true);
        }
    });
}

// Add to Cart Logic
document.addEventListener("click", (e) => {
    if (e.target.classList.contains("add-to-cart")) {
        const id = parseInt(e.target.getAttribute("data-id"), 10);
        const title = e.target.getAttribute("data-title");
        const price = parseFloat(e.target.getAttribute("data-price"));

        const existingItem = cart.find(item => item.id === id);
        if (existingItem) {
            existingItem.quantity += 1;
        } else {
            cart.push({ id, title, price, quantity: 1 });
        }

        localStorage.setItem("cart", JSON.stringify(cart));
        updateCartCount();
        displayMessage(`${title} added to your cart.`);
    }
});

// Checkout button logic
document.addEventListener("DOMContentLoaded", () => {
    const checkoutButton = document.getElementById("checkout-button");
    if (checkoutButton) {
        checkoutButton.addEventListener("click", () => {
            window.location.href = "checkout.html";
        });
    }
});
