import Navbar from "../../components/sections/Navbar/navbar";
import Footer from "../../components/sections/Footer/footer";
import HeroSection from "../../components/sections/Hero/hero";
import UpcomingCompetitions from "../../components/sections/UpcomingCompetitions/upcomingCompetitions";
import Features from "../../components/sections/Features/features";

const Home = () => {
    return (
        <>
            <Navbar />
            <HeroSection />
            <UpcomingCompetitions />
            <Features />
            <Footer />
        </>
    );
};

export default Home;
