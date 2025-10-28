class SimpleNotification {
    constructor() {
        this.permission = Notification.permission;
        this.isSupported = 'Notification' in window;
    }

    async askPermission() {
        if (!this.isSupported) {
            return false;
        }

        if (this.permission === 'granted') {
            return true;
        }

        if (this.permission === 'denied') {
            return false;
        }

        const userResponse = confirm('🔔 Aktifkan notifikasi untuk menerima pemberitahuan pesan baru?');
        
        if (userResponse) {
            try {
                const permission = await Notification.requestPermission();
                this.permission = permission;
                return permission === 'granted';
            } catch (error) {
                console.error('Error:', error);
            }
        }
        return false;
    }

    showNewMessage(senderName, message) {
        if (this.permission !== 'granted') return;

        const notification = new Notification(`Pesan dari ${senderName}`, {
            body: message.length > 100 ? message.substring(0, 100) + '...' : message
        });

        notification.onclick = () => {
            window.focus();
            notification.close();
        };

        setTimeout(() => notification.close(), 5000);
    }
}

const simpleNotif = new SimpleNotification();