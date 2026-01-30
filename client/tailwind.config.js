/** @type {import('tailwindcss').Config} */
module.exports = {
    content: [
        "./src/**/*.{js,jsx,ts,tsx}",
    ],
    theme: {
        extend: {
            colors: {
                'avalon-dark': '#1a1a1d',
                'avalon-gold': '#c3a13c',
                'avalon-red': '#950740',
                'avalon-gray': '#4e4e50',
            }
        },
    },
    plugins: [],
}
