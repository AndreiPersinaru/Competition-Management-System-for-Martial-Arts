import React, { useState, useContext } from "react";
import Navbar from "../../components/sections/Navbar/Navbar";
import { Box, Container, Typography, TextField, Button, Paper, Link, Alert } from "@mui/material";
import Grid from "@mui/material/Grid2";
import { Lock as LockIcon } from "@mui/icons-material";
import { Link as RouterLink, useNavigate } from "react-router-dom";
import axios from "axios";
import { AuthContext } from "../../context/AuthContext";
import backgroundImage from "../../assets/pictures/home-background.jpg";

const Login = () => {
    const { login } = useContext(AuthContext);
    const [username, setUsername] = useState("");
    const [password, setPassword] = useState("");
    const [error, setError] = useState("");
    const [loading, setLoading] = useState(false);
    const navigate = useNavigate();

    const apiClient = axios.create({
        timeout: 5000,
        headers: {
            "Content-Type": "application/json",
        },
    });

    const handleSubmit = async (event) => {
        event.preventDefault();

        if (!username.trim() || !password.trim()) {
            setError("Te rugăm să completezi toate câmpurile");
            return;
        }

        setLoading(true);
        setError("");

        try {
            const response = await apiClient.post("http://127.0.0.1:8000/api/login/", {
                username,
                password,
            });

            login(response.data.access, response.data.refresh);
            navigate("/");
        } catch (error) {
            const errorMessage = error.response?.data?.error || "Autentificare eșuată";
            setError(errorMessage);
            setLoading(false);
        }
    };

    return (
        <>
            {/* Navbar */}
            <Navbar />
            {/* Login Form */}
            <Box
                sx={{
                    position: "relative",
                    display: "flex",
                    justifyContent: "center",
                    alignItems: "center",
                    minHeight: "100vh",
                    overflow: "hidden",
                    "&::before": {
                        content: '""',
                        position: "absolute",
                        width: "100%",
                        height: "100%",
                        backgroundImage: `url(${backgroundImage})`,
                        backgroundSize: "100% 100%",
                        filter: "blur(2px) brightness(0.5)",
                        transform: "scale(1.01)",
                        zIndex: -1,
                    },
                }}
            >
                <Container maxWidth="sm">
                    <Paper elevation={8} sx={{ p: 4 }}>
                        <Box sx={{ textAlign: "center", mb: 3 }}>
                            <LockIcon fontSize="large" color="primary" />
                        </Box>
                        <Typography variant="h5" align="center" gutterBottom>
                            Autentificare
                        </Typography>

                        {error && (
                            <Alert severity="error" sx={{ mb: 2 }}>
                                {error}
                            </Alert>
                        )}

                        <Box component="form" onSubmit={handleSubmit} noValidate sx={{ mt: 1 }}>
                            <TextField
                                margin="normal"
                                required
                                fullWidth
                                label="Nume de utilizator"
                                name="username"
                                autoComplete="username"
                                autoFocus
                                value={username}
                                onChange={(e) => setUsername(e.target.value)}
                                disabled={loading}
                            />
                            <TextField
                                margin="normal"
                                required
                                fullWidth
                                name="password"
                                label="Parolă"
                                type="password"
                                autoComplete="current-password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                disabled={loading}
                            />
                            <Button type="submit" fullWidth variant="contained" sx={{ mt: 3, mb: 2 }} disabled={loading}>
                                {loading ? "Se procesează..." : "Autentifică-te"}
                            </Button>
                            <Grid container spacing={2}>
                                <Grid xs={6}>
                                    <Link component={RouterLink} to="/forgot-password" variant="body2">
                                        Ai uitat parola?
                                    </Link>
                                </Grid>
                                <Grid xs={6} sx={{ textAlign: "right" }}>
                                    <Link component={RouterLink} to="/register" variant="body2">
                                        {"Nu ai un cont? Înregistrează-te"}
                                    </Link>
                                </Grid>
                            </Grid>
                        </Box>
                    </Paper>
                </Container>
            </Box>
        </>
    );
};

export default Login;
