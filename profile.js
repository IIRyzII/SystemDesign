document.addEventListener('DOMContentLoaded', () => {
    // Get references to common elements
    const usernameDisplay = document.getElementById("username-display");
    const logoutButton = document.getElementById("logout-button");
    const orderHistory = document.getElementById("order-history");

    // Mock Database
    let userDatabase = JSON.parse(localStorage.getItem("userDatabase")) || [];
    let currentUser = localStorage.getItem("currentUser");

    // Ensure user is signed in
    if (!currentUser) {
        window.location.href = "signin.html"; // Redirect to sign-in if not logged in
        return;
    }

    // Display Username
    if (usernameDisplay && currentUser) {
        const user = userDatabase.find(user => user.username === currentUser);
        if (user) {
            usernameDisplay.textContent = `${user.username} (${user.membership})`; // Display username and membership
        }
    }

    // Logout functionality
    if (logoutButton) {
        logoutButton.addEventListener("click", () => {
            localStorage.removeItem("currentUser");
            window.location.href = "signin.html"; // Redirect to sign-in after logout
        });
    }

    // Fetch Orders and display them if they belong to the current user
    const orders = JSON.parse(localStorage.getItem("orders")) || [];
    const userOrders = orders.filter(order => order.user === currentUser); // Filter orders for the current user

    if (userOrders.length === 0) {
        orderHistory.innerHTML = "<p>You have no orders yet.</p>"; // Display message if no orders found
    } else {
        userOrders.forEach(order => {
            const orderElement = document.createElement("div");
            orderElement.classList.add("order");

            // Calculate points earned (money spent - shipping) / 100, rounded down
            const pointsEarned = Math.floor((order.total - order.shipping) / 1);

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
            orderHistory.appendChild(orderElement);
        });
    }

})