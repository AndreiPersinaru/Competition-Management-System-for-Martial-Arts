import React, { useState, useContext } from "react";
import Navbar from "../../components/sections/Navbar/Navbar";
import { Box, Container, Typography, TextField, Button, Paper, Link, Alert } from "@mui/material";
import Grid from "@mui/material/Grid2";
import { Lock as LockIcon } from "@mui/icons-material";
import { Link as RouterLink, useNavigate } from "react-router-dom";
import axios from "axios";
import { AuthContext } from "../../context/AuthContext";

const Register = () => {
    const { login } = useContext(AuthContext);
    const [username, setUsername] = useState("");
    const [password, setPassword] = useState("");
    const [email, setEmail] = useState("");
    const [error, setError] = useState("");
    const [loading, setLoading] = useState(false);
    const navigate = useNavigate();

    const apiClient = axios.create({
        timeout: 2000,
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
            const response = await apiClient.post("http://127.0.0.1:8000/api/register/", {
                username,
                password,
                email,
            });

            login(response.data.tokens.access, response.data.tokens.refresh);
            navigate("/");
        } catch (error) {
            console.log(error.response);
            const errorMessage = error.response?.data?.error || "Înregistrare eșuată";
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
                    display: "flex",
                    justifyContent: "center",
                    alignItems: "center",
                    minHeight: "100vh",
                }}
            >
                <Container maxWidth="sm">
                    <Paper elevation={4} sx={{ p: 4 }}>
                        <Box sx={{ textAlign: "center", mb: 3 }}>
                            <LockIcon fontSize="large" color="primary" />
                        </Box>
                        <Typography variant="h5" align="center" gutterBottom>
                            Înregistrare
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
                                id="username"
                                label="Nume de utilizator"
                                name="username"
                                autoComplete="username"
                                autoFocus
                                value={username}
                                onChange={(e) => setUsername(e.target.value)}
                                disabled={loading}
                                inputProps={{ maxLength: 50 }}
                            />
                            <TextField
                                margin="normal"
                                required
                                fullWidth
                                id="email"
                                label="Adresă de email"
                                name="email"
                                autoComplete="email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                disabled={loading}
                                inputProps={{ maxLength: 50 }}
                            />
                            <TextField
                                margin="normal"
                                required
                                fullWidth
                                name="password"
                                label="Parolă"
                                type="password"
                                id="password"
                                autoComplete="current-password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                disabled={loading}
                                inputProps={{ maxLength: 50 }}
                            />
                            <Button type="submit" fullWidth variant="contained" sx={{ mt: 3, mb: 2 }} disabled={loading}>
                                {loading ? "Se procesează..." : "Înregistrează-te"}
                            </Button>
                            <Grid container spacing={2}>
                                <Grid xs={6} sx={{ textAlign: "right" }}>
                                    <Link component={RouterLink} to="/login" variant="body2">
                                        {"Ai deja cont? Conectează-te"}
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

export default Register;
