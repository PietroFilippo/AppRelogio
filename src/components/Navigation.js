export function Navigation(activeTab, onTabChange) {
    const nav = document.createElement('nav');
    nav.className = 'nav-bar';

    const tabs = [
        { id: 'world-clock', label: 'World Clock', icon: '🌐' },
        { id: 'alarm', label: 'Alarm', icon: '⏰' },
        { id: 'stopwatch', label: 'Stopwatch', icon: '⏱️' },
        { id: 'timer', label: 'Timer', icon: '⏲️' },
        { id: 'settings', label: 'Settings', icon: '⚙️' },
    ];

    tabs.forEach(tab => {
        const button = document.createElement('button');
        button.className = `nav-item ${activeTab === tab.id ? 'active' : ''}`;
        button.innerHTML = `
      <span class="nav-icon">${tab.icon}</span>
      <span class="nav-label">${tab.label}</span>
    `;
        button.onclick = () => onTabChange(tab.id);
        nav.appendChild(button);
    });

    return nav;
}
