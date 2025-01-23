import { Box, Container, Typography, Paper } from "@mui/material";

export default function Home() {
    return (
        <Container>
            <Box bgcolor="black" sx={{ height: "100px" }} />
            <Paper sx={{ padding: "20px", bgcolor: "background.default" }}>
                <Typography variant="h1" align="center">
                    Home Page
                </Typography>
            </Paper>
            <Box bgcolor="black" sx={{ height: "100px" }} />
        </Container>
    );
}
