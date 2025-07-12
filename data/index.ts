import { images } from "@/constants";

export const friends = [
    {
        id: "1",
        name: "Tynisa Obey",
        phoneNumber: "+1-300-400-0135",
        avatar: images.user1,
    },
    {
        id: "2",
        name: "Florencio Dorance",
        phoneNumber: "+1-309-900-0135",
        avatar: images.user2,
    },
    {
        id: "3",
        name: "Chantal Shelburne",
        phoneNumber: "+1-400-100-1009",
        avatar: images.user3,
    },
    {
        id: "4",
        name: "Maryland Winkles",
        phoneNumber: "+1-970-200-4550",
        avatar: images.user4,
    },
    {
        id: "5",
        name: "Rodolfo Goode",
        phoneNumber: "+1-100-200-9800",
        avatar: images.user5,
    },
    {
        id: "6",
        name: "Benny Spanbauer",
        phoneNumber: "+1-780-200-9800",
        avatar: images.user6,
    },
    {
        id: "7",
        name: "Tyra Dillon",
        phoneNumber: "+1-943-230-9899",
        avatar: images.user7,
    },
    {
        id: "8",
        name: "Jamel Eusobio",
        phoneNumber: "+1-900-234-9899",
        avatar: images.user8,
    },
    {
        id: "9",
        name: "Pedro Haurad",
        phoneNumber: "+1-240-234-9899",
        avatar: images.user9
    },
    {
        id: "10",
        name: "Clinton Mcclure",
        phoneNumber: "+1-500-234-4555",
        avatar: images.user10
    },
];

export const userAddresses = [
    {
        id: "1",
        name: "Home",
        address: "364 Stillwater Ave, Attleboro, MA 02703",
    },
    {
        id: "2",
        name: "Office",
        address: "73 Virginia Rd, Cuyahoga Falls, OH 44221",
    },
    {
        id: "3",
        name: "Mall Plaza",
        address: "123 Main St, San Francisco, CA 94107",
    },
    {
        id: "4",
        name: "Garden Park",
        address: "600 Bloom St, Portland, OR 97201",
    },
    {
        id: "5",
        name: "Grand City Park",
        address: "26 State St Daphne, AL 36526"
    },
    {
        id: "6",
        name: "Town Square",
        address: "20 Applegate St. Hoboken, NJ 07030"
    },
    {
        id: "7",
        name: "Bank",
        address: "917 W Pine Street Easton, PA 0423"
    }
];

export const faqKeywords = [
    {
        id: "1",
        name: "General"
    },
    {
        id: "2",
        name: "Account"
    },
    {
        id: "3",
        name: "Security"
    },
    {
        id: "4",
        name: "Tasks"
    },
    {
        id: "5",
        name: "Payment"
    }
];

export const faqs = [
    {
        question: 'How do I create a new task in the app?',
        answer: 'To create a new task, go to the "Tasks" section, click on "Add Task," fill in the details, and save it.',
        type: "General"
    },
    {
        question: 'Can I set deadlines and reminders for tasks?',
        answer: 'Yes, you can set deadlines and enable reminders for tasks while creating or editing them to stay on track.',
        type: "General"
    },
    {
        question: 'What should I do if I need to update or delete a task?',
        answer: 'To update or delete a task, go to the "Tasks" section, select the task, and choose the edit or delete option.',
        type: "Tasks"
    },
    {
        question: 'How can I assign tasks to team members?',
        answer: 'While creating or editing a task, use the "Assign To" field to select team members from the list.',
        type: "Tasks"
    },
    {
        question: 'Is there a way to view tasks by priority or due date?',
        answer: 'Yes, you can use the app’s filters to sort tasks by priority, due date, or status for better organization.',
        type: "Tasks"
    },
    {
        question: 'Can I track the progress of my team’s tasks?',
        answer: 'Yes, the app provides a task tracking feature that shows progress updates, completion status, and deadlines for all assigned tasks.',
        type: "General"
    },
    {
        question: 'Are my task data and personal details secure?',
        answer: 'Yes, we prioritize the security of your task data and personal information with industry-standard encryption protocols.',
        type: "Security"
    },
    {
        question: 'How can I provide feedback or report issues with the app?',
        answer: 'You can provide feedback or report issues through the app’s support section. We value your input to improve the experience.',
        type: "General"
    },
    {
        question: 'Is customer support available through the app?',
        answer: 'Yes, customer support is accessible through the app’s help section for any inquiries or assistance.',
        type: "General"
    },
];

export const messsagesData = [
    {
        id: "1",
        fullName: "Jhon Smith",
        userImg: images.user1,
        lastSeen: "2023-11-16T04:52:06.501Z",
        lastMessage: 'I love you. see you soon baby',
        messageInQueue: 2,
        lastMessageTime: "12:25 PM",
        isOnline: true,
    },
    {
        id: "2",
        fullName: "Anuska Sharma",
        userImg: images.user2,
        lastSeen: "2023-11-18T04:52:06.501Z",
        lastMessage: 'I Know. you are so busy man.',
        messageInQueue: 0,
        lastMessageTime: "12:15 PM",
        isOnline: false
    },
    {
        id: "3",
        fullName: "Virat Kohili",
        userImg: images.user3,
        lastSeen: "2023-11-20T04:52:06.501Z",
        lastMessage: 'Ok, see u soon',
        messageInQueue: 0,
        lastMessageTime: "09:12 PM",
        isOnline: true
    },
    {
        id: "4",
        fullName: "Shikhor Dhaon",
        userImg: images.user4,
        lastSeen: "2023-11-18T04:52:06.501Z",
        lastMessage: 'Great! Do you Love it.',
        messageInQueue: 0,
        lastMessageTime: "04:12 PM",
        isOnline: true
    },
    {
        id: "5",
        fullName: "Shakib Hasan",
        userImg: images.user5,
        lastSeen: "2023-11-21T04:52:06.501Z",
        lastMessage: 'Thank you !',
        messageInQueue: 2,
        lastMessageTime: "10:30 AM",
        isOnline: true
    },
    {
        id: "6",
        fullName: "Jacksoon",
        userImg: images.user6,
        lastSeen: "2023-11-20T04:52:06.501Z",
        lastMessage: 'Do you want to go out dinner',
        messageInQueue: 3,
        lastMessageTime: "10:05 PM",
        isOnline: false
    },
    {
        id: "7",
        fullName: "Tom Jerry",
        userImg: images.user7,
        lastSeen: "2023-11-20T04:52:06.501Z",
        lastMessage: 'Do you want to go out dinner',
        messageInQueue: 2,
        lastMessageTime: "11:05 PM",
        isOnline: true
    },
    {
        id: "8",
        fullName: "Lucky Luck",
        userImg: images.user8,
        lastSeen: "2023-11-20T04:52:06.501Z",
        lastMessage: 'Can you share the design with me?',
        messageInQueue: 2,
        lastMessageTime: "09:11 PM",
        isOnline: true
    },
    {
        id: "9",
        fullName: "Nate Jack",
        userImg: images.user9,
        lastSeen: "2023-11-20T04:52:06.501Z",
        lastMessage: 'Tell me what you want?',
        messageInQueue: 0,
        lastMessageTime: "06:43 PM",
        isOnline: true
    }
];

export const callData = [
    {
        id: "1",
        fullName: "Roselle Erhman",
        userImg: images.user10,
        status: "Incoming",
        date: "Dec 19, 2024"
    },
    {
        id: "2",
        fullName: "Willard Purnell",
        userImg: images.user9,
        status: "Outgoing",
        date: "Dec 17, 2024"
    },
    {
        id: "3",
        fullName: "Charlotte Hanlin",
        userImg: images.user8,
        status: "Missed",
        date: "Dec 16, 2024"
    },
    {
        id: "4",
        fullName: "Merlin Kevin",
        userImg: images.user7,
        status: "Missed",
        date: "Dec 16, 2024"
    },
    {
        id: "5",
        fullName: "Lavern Laboy",
        userImg: images.user6,
        status: "Outgoing",
        date: "Dec 16, 2024"
    },
    {
        id: "6",
        fullName: "Phyllis Godley",
        userImg: images.user5,
        status: "Incoming",
        date: "Dec 15, 2024"
    },
    {
        id: "7",
        fullName: "Tyra Dillon",
        userImg: images.user4,
        status: "Outgoing",
        date: "Dec 15, 2024"
    },
    {
        id: "8",
        fullName: "Marci Center",
        userImg: images.user3,
        status: "Missed",
        date: "Dec 15, 2024"
    },
    {
        id: "9",
        fullName: "Clinton Mccure",
        userImg: images.user2,
        status: "Outgoing",
        date: "Dec 15, 2024"
    },
];

export const recentprojects = [
    {
        id: "1",
        name: "Tiki Mobile App Project",
        description: "UI Kit Design Project",
        image: images.cover1,
        status: "In Progress",
        numberOfTask: 90,
        numberOfTaskCompleted: 72,
        startDate: "Dec 15, 2025",
        endDate: "Dec 31, 2025",
        numberOfDaysLeft: 0,
        logo: images.logo1,
        menbers: [images.user1, images.user2, images.user3]
    },
    {
        id: "2",
        name: "E-Commerce Dashboard",
        description: "Admin Panel for Online Store",
        image: images.cover2,
        status: "In Progress",
        numberOfTask: 120,
        numberOfTaskCompleted: 85,
        startDate: "Jan 10, 2026",
        endDate: "Feb 20, 2026",
        numberOfDaysLeft: 30,
        logo: images.logo2,
        menbers: [images.user1, images.user2, images.user3]
    },
    {
        id: "3",
        name: "Crypto Wallet App",
        description: "Secure Mobile Wallet for Crypto",
        image: images.cover3,
        status: "On Hold",
        numberOfTask: 75,
        numberOfTaskCompleted: 30,
        startDate: "Nov 05, 2025",
        endDate: "Dec 20, 2025",
        numberOfDaysLeft: 12,
        logo: images.logo3,
        menbers: [images.user1, images.user2, images.user3]
    },
    {
        id: "4",
        name: "Social Media App",
        description: "New Generation Social Networking",
        image: images.cover3,
        status: "In Progress",
        numberOfTask: 150,
        numberOfTaskCompleted: 100,
        startDate: "Feb 01, 2026",
        endDate: "Apr 15, 2026",
        numberOfDaysLeft: 55,
        logo: images.logo4,
        menbers: [images.user1, images.user2, images.user3]
    },
    {
        id: "5",
        name: "AI Chatbot Integration",
        description: "AI-Powered Support System",
        image: images.cover5,
        status: "Completed",
        numberOfTask: 60,
        numberOfTaskCompleted: 60,
        startDate: "Oct 01, 2025",
        endDate: "Nov 10, 2025",
        numberOfDaysLeft: 0,
        logo: images.logo5,
        menbers: [images.user1, images.user2, images.user3]
    },
    {
        id: "6",
        name: "Fitness Tracker App",
        description: "Health & Fitness Mobile Application",
        image: images.cover6,
        status: "In Progress",
        numberOfTask: 110,
        numberOfTaskCompleted: 70,
        startDate: "Mar 05, 2026",
        endDate: "May 25, 2026",
        numberOfDaysLeft: 80,
        logo: images.logo6,
        menbers: [images.user1, images.user2, images.user3]
    },
    {
        id: "7",
        name: "E-Learning Platform",
        description: "Online Course Marketplace",
        image: images.cover7,
        status: "Planning",
        numberOfTask: 0,
        numberOfTaskCompleted: 0,
        startDate: "Jun 01, 2026",
        endDate: "Aug 30, 2026",
        numberOfDaysLeft: 120,
        logo: images.logo7,
        menbers: [images.user1, images.user2, images.user3]
    }
];

export const allprojects = [
    {
        id: "1",
        name: "Tiki Mobile App Project",
        description: "UI Kit Design Project",
        image: images.cover1,
        status: "In Progress",
        numberOfTask: 90,
        numberOfTaskCompleted: 72,
        startDate: "Dec 15, 2025",
        endDate: "Dec 31, 2025",
        numberOfDaysLeft: 0,
        logo: images.logo1,
        menbers: [images.user1, images.user2, images.user3]
    },
    {
        id: "2",
        name: "E-Commerce Dashboard",
        description: "Admin Panel for Online Store",
        image: images.cover2,
        status: "In Progress",
        numberOfTask: 120,
        numberOfTaskCompleted: 85,
        startDate: "Jan 10, 2026",
        endDate: "Feb 20, 2026",
        numberOfDaysLeft: 30,
        logo: images.logo2,
        menbers: [images.user1, images.user2, images.user3]
    },
    {
        id: "3",
        name: "Crypto Wallet App",
        description: "Secure Mobile Wallet for Crypto",
        image: images.cover3,
        status: "On Hold",
        numberOfTask: 75,
        numberOfTaskCompleted: 30,
        startDate: "Nov 05, 2025",
        endDate: "Dec 20, 2025",
        numberOfDaysLeft: 12,
        logo: images.logo3,
        menbers: [images.user1, images.user2, images.user3]
    },
    {
        id: "4",
        name: "Social Media App",
        description: "New Generation Social Networking",
        image: images.cover3,
        status: "In Progress",
        numberOfTask: 150,
        numberOfTaskCompleted: 100,
        startDate: "Feb 01, 2026",
        endDate: "Apr 15, 2026",
        numberOfDaysLeft: 55,
        logo: images.logo4,
        menbers: [images.user1, images.user2, images.user3]
    },
    {
        id: "5",
        name: "AI Chatbot Integration",
        description: "AI-Powered Support System",
        image: images.cover5,
        status: "Completed",
        numberOfTask: 60,
        numberOfTaskCompleted: 60,
        startDate: "Oct 01, 2025",
        endDate: "Nov 10, 2025",
        numberOfDaysLeft: 0,
        logo: images.logo5,
        menbers: [images.user1, images.user2, images.user3]
    },
    {
        id: "6",
        name: "Fitness Tracker App",
        description: "Health & Fitness Mobile Application",
        image: images.cover6,
        status: "In Progress",
        numberOfTask: 110,
        numberOfTaskCompleted: 70,
        startDate: "Mar 05, 2026",
        endDate: "May 25, 2026",
        numberOfDaysLeft: 80,
        logo: images.logo6,
        menbers: [images.user1, images.user2, images.user3]
    },
    {
        id: "7",
        name: "E-Learning Platform",
        description: "Online Course Marketplace",
        image: images.cover7,
        status: "Planning",
        numberOfTask: 0,
        numberOfTaskCompleted: 0,
        startDate: "Jun 01, 2026",
        endDate: "Aug 30, 2026",
        numberOfDaysLeft: 120,
        logo: images.logo7,
        menbers: [images.user1, images.user2, images.user3]
    }
];

export const myprojects = [
    {
        id: "1",
        name: "Tiki Mobile App Project",
        description: "UI Kit Design Project",
        image: images.cover1,
        status: "In Progress",
        numberOfTask: 90,
        numberOfTaskCompleted: 72,
        startDate: "Dec 15, 2025",
        endDate: "Dec 31, 2025",
        numberOfDaysLeft: 0,
        logo: images.logo1,
        menbers: [images.user1, images.user2, images.user3],
        categoryId: "2",
    },
    {
        id: "2",
        name: "E-Commerce Dashboard",
        description: "Admin Panel for Online Store",
        image: images.cover2,
        status: "In Progress",
        numberOfTask: 120,
        numberOfTaskCompleted: 85,
        startDate: "Jan 10, 2026",
        endDate: "Feb 20, 2026",
        numberOfDaysLeft: 30,
        logo: images.logo2,
        menbers: [images.user1, images.user2, images.user3],
        categoryId: "2",
    },
    {
        id: "3",
        name: "Crypto Wallet App",
        description: "Secure Mobile Wallet for Crypto",
        image: images.cover3,
        status: "To Do",
        numberOfTask: 75,
        numberOfTaskCompleted: 30,
        startDate: "Nov 05, 2025",
        endDate: "Dec 20, 2025",
        numberOfDaysLeft: 12,
        logo: images.logo3,
        menbers: [images.user1, images.user2, images.user3],
        categoryId: "1",
    },
    {
        id: "4",
        name: "Social Media App",
        description: "New Generation Social Networking",
        image: images.cover3,
        status: "In Progress",
        numberOfTask: 150,
        numberOfTaskCompleted: 100,
        startDate: "Feb 01, 2026",
        endDate: "Apr 15, 2026",
        numberOfDaysLeft: 55,
        logo: images.logo4,
        menbers: [images.user1, images.user2, images.user3],
        categoryId: "2",
    },
    {
        id: "5",
        name: "AI Chatbot Integration",
        description: "AI-Powered Support System",
        image: images.cover5,
        status: "Completed",
        numberOfTask: 60,
        numberOfTaskCompleted: 60,
        startDate: "Oct 01, 2025",
        endDate: "Nov 10, 2025",
        numberOfDaysLeft: 0,
        logo: images.logo5,
        menbers: [images.user1, images.user2, images.user3],
        categoryId: "3",
    },
    {
        id: "6",
        name: "Fitness Tracker App",
        description: "Health & Fitness Mobile Application",
        image: images.cover6,
        status: "In Progress",
        numberOfTask: 110,
        numberOfTaskCompleted: 70,
        startDate: "Mar 05, 2026",
        endDate: "May 25, 2026",
        numberOfDaysLeft: 80,
        logo: images.logo6,
        menbers: [images.user1, images.user2, images.user3],
        categoryId: "2",
    },
    {
        id: "7",
        name: "E-Learning Platform",
        description: "Online Course Marketplace",
        image: images.cover7,
        status: "To Do",
        numberOfTask: 0,
        numberOfTaskCompleted: 0,
        startDate: "Jun 01, 2026",
        endDate: "Aug 30, 2026",
        numberOfDaysLeft: 120,
        logo: images.logo7,
        menbers: [images.user1, images.user2, images.user3],
        categoryId: "1",
    },
    {
        id: "8",
        name: "Project Management App",
        description: "Project Management Mobile Application",
        image: images.cover6,
        status: "To Do",
        numberOfTask: 109,
        numberOfTaskCompleted: 78,
        startDate: "Mar 05, 2026",
        endDate: "May 25, 2026",
        numberOfDaysLeft: 12,
        logo: images.logo6,
        menbers: [images.user3, images.user4, images.user5],
        categoryId: "1",
    },
    {
        id: "9",
        name: "Fitness Tracker App",
        description: "Health & Fitness Mobile Application",
        image: images.cover6,
        status: "To Do",
        numberOfTask: 110,
        numberOfTaskCompleted: 70,
        startDate: "Mar 05, 2026",
        endDate: "May 25, 2026",
        numberOfDaysLeft: 80,
        logo: images.logo6,
        menbers: [images.user1, images.user2, images.user3],
        categoryId: "1",
    },
];

export const todayTasks = [
    {
        id: "1",
        name: "Kickoff Meeting Project",
        time: "12.00 PM"
    },
    {
        id: "2",
        name: "Create Wireframe Kit",
        time: "13.00 PM"
    },
    {
        id: "3",
        name: "Meeting with Client",
        time: "14.00 PM"
    },
    {
        id: "4",
        name: "Design User Interface",
        time: "15.00 PM"
    },
    {
        id: "5",
        name: "Develop Backend API",
        time: "16.00 PM"
    },
    {
        id: "6",
        name: "Develop 3D Illustrations",
        time: "17.00 PM"
    },
    {
        id: "7",
        name: "Finalize Project Plan",
        time: "18.00 PM"
    }
];

export const allTasks = [
    {
        id: "1",
        name: "Kickoff Meeting Project",
        time: "12.00 PM"
    },
    {
        id: "2",
        name: "Create Wireframe Kit",
        time: "13.00 PM"
    },
    {
        id: "3",
        name: "Meeting with Client",
        time: "14.00 PM"
    },
    {
        id: "4",
        name: "Design User Interface",
        time: "15.00 PM"
    },
    {
        id: "5",
        name: "Develop Backend API",
        time: "16.00 PM"
    },
    {
        id: "6",
        name: "Develop 3D Illustrations",
        time: "17.00 PM"
    },
    {
        id: "7",
        name: "Finalize Project Plan",
        time: "18.00 PM"
    }
];

export const subTasks = [
    {
        id: "1",
        name: "Kickoff Meeting Project",
        time: "12.00 PM"
    },
    {
        id: "2",
        name: "Create Wireframe Kit",
        time: "13.00 PM"
    },
    {
        id: "3",
        name: "Meeting with Client",
        time: "14.00 PM"
    },
    {
        id: "4",
        name: "Design User Interface",
        time: "15.00 PM"
    },
    {
        id: "5",
        name: "Develop Backend API",
        time: "16.00 PM"
    },
    {
        id: "6",
        name: "Develop 3D Illustrations",
        time: "17.00 PM"
    },
    {
        id: "7",
        name: "Finalize Project Plan",
        time: "18.00 PM"
    }
];

export const categories = [
    {
        id: "1",
        name: "To Do",
    },
    {
        id: "2",
        name: "In Progress",
    },
    {
        id: "3",
        name: "Completed",
    },
    {
        id: "4",
        name: "Upcoming",
    }
]

export const notifications = [
    { id: "1", name: "Jacob Jones", message: "Leave a comment on the", app: "Tiki App", avatar: images.user1, type: "view", date: "Today" },
    { id: "2", name: "Jenny Wilson", message: "Adding a task to the", app: "3D Design", avatar: images.user2, type: "view", date: "Today" },
    { id: "3", name: "Wade Warren", message: "Have been invited to the project", app: "", avatar: images.user3, type: "invite", date: "Today" },
    { id: "4", name: "Guy Hawkins", message: "Adding a task to the", app: "NFT App", avatar: images.user4, type: "view", date: "Yesterday" },
    { id: "5", name: "Kathryn Murphy", message: "Have been invited to the project", app: "", avatar: images.user5, type: "invite", date: "Yesterday" },
    { id: "6", name: "Eleanor Pena", message: "Leave a comment on the", app: "Job App", avatar: images.user6, type: "view", date: "Yesterday" },
    { id: "7", name: "Marvin McKinney", message: "Have been invited to the project", app: "", avatar: images.user7, type: "invite", date: "December 11, 2024" },
    { id: "8", name: "Dianne Russell", message: "Leave a comment on the", app: "Tiki App", avatar: images.user8, type: "view", date: "December 11, 2024" },
];

export const projectComments = [
    {
        id: "1",
        avatar: images.user1,
        name: "John Smith",
        comment: "The new task tracking feature is fantastic! It has significantly improved our workflow and made collaboration much smoother. Great job! 👏",
        date: "2024-03-28T12:00:00.000Z",
        numLikes: 320
    },
    {
        id: "2",
        avatar: images.user2,
        name: "Emily Davis",
        comment: "I love the recent UI updates! The dashboard feels more intuitive, and it's much easier to find what I need. Keep up the great work!",
        date: "2024-03-28T12:00:00.000Z",
        numLikes: 95
    },
    {
        id: "3",
        avatar: images.user3,
        name: "Michael Rodriguez",
        comment: "The new notifications system is a game-changer! Now I never miss important updates or deadlines. Thanks for implementing this!",
        date: "2024-03-29T12:00:00.000Z",
        numLikes: 210
    },
    {
        id: "4",
        avatar: images.user4,
        name: "Sarah Brown",
        comment: "I've noticed a significant boost in team productivity since the latest feature release. The task automation saves us so much time!",
        date: "2024-03-29T12:00:00.000Z",
        numLikes: 150
    },
    {
        id: "5",
        avatar: images.user5,
        name: "David Wilson",
        comment: "Absolutely love the new project templates! They make setting up new projects a breeze and ensure consistency across teams.",
        date: "2024-02-31T12:00:00.000Z",
        numLikes: 500
    },
    {
        id: "6",
        avatar: images.user6,
        name: "Luca Dalasias",
        comment: "The latest update has made the mobile app experience so much better. I can now manage my tasks efficiently on the go!",
        date: "2024-02-29T12:00:00.000Z",
        numLikes: 210
    },
];

export const teamMembers = [
    {
      id: "1",
      name: "Daniel Austin",
      username: "daniel_austin",
      avatar: images.user1,
    },
    {
      id: "2",
      name: "Jenny Wilson",
      username: "jenny_wilson",
      avatar: images.user2,
    },
    {
      id: "3",
      name: "Wade Warren",
      username: "wade_warren",
      avatar: images.user3,
    },
    {
      id: "4",
      name: "Jane Cooper",
      username: "jane_cooper",
      avatar: images.user4,
    },
    {
      id: "5",
      name: "Maria Natalia",
      username: "maria_natalia",
      avatar: images.user5,
    },
    {
      id: "6",
      name: "Eleanor Pena",
      username: "eleanor_pena",
      avatar: images.user6,
    },
    {
      id: "7",
      name: "Courtney Henry",
      username: "courtney_henry",
      avatar: images.user7,
    },
  ];

  export const usersData  = [
    { id: "1", name: "Brooklyn Simmons", username: "brooklyn_simmons", avatar: images.user1, invited: false },
    { id: "2", name: "Kristin Watson", username: "kristin_watson", avatar: images.user2, invited: true },
    { id: "3", name: "Robert Fox", username: "robert_fox", avatar: images.user3, invited: false },
    { id: "4", name: "Dianne Russell", username: "dianne_russell", avatar: images.user4, invited: true },
    { id: "5", name: "Theresa Webb", username: "theresa_webb", avatar: images.user5, invited: false },
    { id: "6", name: "Annette Black", username: "annette_black", avatar: images.user6, invited: false },
    { id: "7", name: "Bessie Cooper", username: "bessie_cooper", avatar: images.user7, invited: true },
    { id: "8", name: "Jacob Jones", username: "jacob_jones", avatar: images.user8, invited: false }
  ];
  

  export const teamInboxMembers = [
    { id: "1", name: "Daniel Austin", username: "daniel_austin", avatar: images.user1, isYou: true },
    { id: "2", name: "Jane Cooper", username: "jane_cooper", avatar: images.user2 },
    { id: "3", name: "Wade Warren", username: "wade_warren", avatar: images.user3 },
    { id: "4", name: "Jenny Wilson", username: "jenny_wilson", avatar: images.user4 },
    { id: "5", name: "Eleanor Pena", username: "eleanor_pena", avatar: images.user5 },
    { id: "6", name: "Darrell Steward", username: "darrel_steward", avatar: images.user6 },
    { id: "7", name: "Esther Howard", username: "esther_howard", avatar: images.user7 },
    { id: "8", name: "Courtney Henry", username: "courtney_henry", avatar: images.user8 },
    { id: "9", name: "Jack Ericson", username: "jack_ericson", avatar: images.user9 },
  ];